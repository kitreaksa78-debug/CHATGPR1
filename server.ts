import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
import { getGeminiClient, formatAttachmentsForGemini } from "./src/services/gemini.js";
import { routeUserRequest } from "./src/services/router.js";
import { generateAIImage } from "./src/services/imageGeneration.js";
import { searchWeb, formatSearchResults } from "./src/services/webSearch.js";
import {
  getAllAgents, getAgentById, createAgent, updateAgent, deleteAgent,
  toggleAgent, toggleHumanTakeover, getAgentConversations,
  getFacebookAgent, getTelegramAgent,
  getConversationById, addMessageToConversation
} from "./src/services/agentStorage.js";
import { verifyFacebookWebhook, processFacebookMessage, setupFacebookWebhook, getFacebookPageInfo, createFacebookPost, processFacebookComment } from "./src/services/facebookAgent.js";
import { processTelegramMessage, setupTelegramWebhook, getTelegramBotInfo, sendTelegramMessage } from "./src/services/telegramAgent.js";
import { generateVisualExplanation } from "./src/services/visualExplanation.js";
import { parseGeminiError } from "./src/services/errorHelper.js";
import { generateResilientResponse } from "./src/services/fallbackResponder.js";
import { streamQ8Fallback, testQ8Health } from "./src/services/q8Fallback.js";
import { routeAndStream } from "./src/services/aiRouter.js";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3000;
const TELEGRAM_API = "https://api.telegram.org";

// CORS middleware — allow the deployed frontend to call the API
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Body Parsers with large limit for base64 image/file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CHAT GPR Multimodal AI Engine",
    time: new Date().toISOString(),
  });
});

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

// Helper to detect base URL from request
function getBaseUrl(req: express.Request): string {
  const proto = req.headers["x-forwarded-proto"] as string || req.protocol;
  const host = req.headers["x-forwarded-host"] as string || req.headers.host;
  return `${proto}://${host}`;
}

// Google OAuth: Redirect to Google consent screen
app.get("/api/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect("/#/login?error=no_google_config");
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Google OAuth: Handle callback
app.get("/api/auth/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`/#/login?error=${error || "no_code"}`);
  }

  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("[Auth] Token exchange error:", tokenData.error);
      return res.redirect("/#/login?error=token_exchange_failed");
    }

    // Get user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();

    if (!userData.email) {
      return res.redirect("/#/login?error=no_email");
    }

    // Create session data
    const sessionData = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      },
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };

    // Redirect to chat with session data in query string (outside hash)
    const encodedSession = encodeURIComponent(JSON.stringify(sessionData));
    res.redirect(`/?session=${encodedSession}#/chat`);
  } catch (err) {
    console.error("[Auth] Callback error:", err);
    return res.redirect("/?error=auth_failed#/login");
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

// 1. Streaming Chat & Multimodal Routing Endpoint
app.post("/api/chat/stream", async (req, res) => {
  const { 
    messages = [], 
    prompt = "", 
    attachments = [], 
    webSearchEnabled = false,
    settings = {},
  } = req.body;

  if (!prompt && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: "Prompt or attachment is required" });
  }

  // Determine intent routing
  const hasImage = attachments.some((a: any) => a.category === "image");
  const hasDocument = attachments.some((a: any) => a.category === "document" || a.type === "application/pdf");
  const route = routeUserRequest(prompt, hasImage, hasDocument, webSearchEnabled);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Send initial intent event
  res.write(`data: ${JSON.stringify({ type: "intent", intent: route.intent, isVisualExplanation: route.isVisualExplanation })}\n\n`);

  // Send search status events for web search queries — multi-stage feedback
  if (route.isWebSearch) {
    const lang = route.language;
    const searchingMsg = lang === "km"
      ? "🔎 កំពុងស្វែងរកព័ត៌មានក្នុងវ៉ិប..."
      : "🔎 Searching the web...";
    const rewritingMsg = lang === "km"
      ? "✏️ កំពុងរៀបចំសំណួរស្វែងរក..."
      : "✏️ Rewriting search queries...";
    const analyzingMsg = lang === "km"
      ? "🧠 កំពុងវិភាគប្រភពព័ត៌មាន..."
      : "🧠 Analyzing sources...";
    const verifyingMsg = lang === "km"
      ? "✅ កំពុងផ្ទៀងផ្ទាត់ព័ត៌មាន..."
      : "✅ Verifying information...";

    res.write(`data: ${JSON.stringify({ type: "search_status", status: "searching", message: rewritingMsg })}\n\n`);
    await new Promise((r) => setTimeout(r, 400));
    res.write(`data: ${JSON.stringify({ type: "search_status", status: "searching", message: searchingMsg })}\n\n`);
    await new Promise((r) => setTimeout(r, 600));
    res.write(`data: ${JSON.stringify({ type: "search_status", status: "analyzing", message: analyzingMsg })}\n\n`);
    await new Promise((r) => setTimeout(r, 400));
    res.write(`data: ${JSON.stringify({ type: "search_status", status: "verifying", message: verifyingMsg })}\n\n`);
  }

  // Handle Pure Artistic Image Generation or Conversational Image Editing
  if (route.isImageGeneration) {
    try {
      res.write(`data: ${JSON.stringify({ type: "status", message: "កំពុងដំណើរការ Gemini 3.1 Flash Image (Nano Banana 2)..." })}\n\n`);
      const targetImagePrompt = route.cleanImagePrompt || prompt;

      // Extract reference image if provided in current attachments
      let inputImageBase64: string | undefined = undefined;
      let inputImageMimeType: string | undefined = undefined;

      const imageAttachment = attachments.find((a: any) => a.category === "image" || a.type?.startsWith("image/"));
      if (imageAttachment) {
        inputImageBase64 = imageAttachment.base64Data || imageAttachment.dataUrl?.split(",")[1];
        inputImageMimeType = imageAttachment.type || "image/png";
      } else {
        // Check previous message for an existing generated image to edit conversationally
        const lastAssistantMsg = messages.slice().reverse().find((m: any) => m.role === "assistant" && m.generatedImage?.imageUrl);
        if (lastAssistantMsg?.generatedImage?.imageUrl?.startsWith("data:image/")) {
          const parts = lastAssistantMsg.generatedImage.imageUrl.split(",");
          const mimeMatch = parts[0].match(/:(.*?);/);
          inputImageMimeType = mimeMatch ? mimeMatch[1] : "image/png";
          inputImageBase64 = parts[1];
        }
      }

      const requestedImageSize = req.body.imageSize || "2K";
      const requestedAspectRatio = req.body.aspectRatio;

      const imageResult = await generateAIImage({
        prompt: targetImagePrompt,
        aspectRatio: requestedAspectRatio,
        imageSize: requestedImageSize,
        inputImageBase64,
        inputImageMimeType,
        isEditMode: !!inputImageBase64,
      });

      if (imageResult.success && imageResult.imageUrl) {
        res.write(`data: ${JSON.stringify({
          type: "image_gen_success",
          imageUrl: imageResult.imageUrl,
          prompt: targetImagePrompt,
          revisedPrompt: imageResult.revisedPrompt,
          model: imageResult.model || "gemini-3.1-flash-image (Nano Banana 2)",
          imageSize: imageResult.imageSize || requestedImageSize,
          aspectRatio: imageResult.aspectRatio,
          isEdited: imageResult.isEdited,
        })}\n\n`);

        const isKhmer = route.language === "km";
        const replyText = isKhmer 
          ? (imageResult.isEdited 
              ? "បាន! ខ្ញុំបានកែប្រែ និងបង្កើតរូបភាពកម្រិត 2K/4K តាមសំណើរបស់អ្នករួចរាល់ហើយ។"
              : "បាន! ខ្ញុំបានបង្កើតរូបភាពកម្រិត 2K/4K តាមរយៈ Gemini 3.1 Flash Image រួចរាល់ហើយ។")
          : (imageResult.isEdited
              ? "I have edited and rendered your image in high-resolution."
              : "Here is your high-resolution photorealistic image generated with Gemini 3.1 Flash Image (Nano Banana 2).");
        res.write(`data: ${JSON.stringify({ type: "token", text: replyText })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({
          type: "image_gen_error",
          error: imageResult.error || "Image generation could not be completed at this time.",
        })}\n\n`);
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({
        type: "image_gen_error",
        error: parseGeminiError(err),
      })}\n\n`);
    } finally {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      return res.end();
    }
  }

  // Handle Multimodal Text & Visual Explanation Stream
  try {
    const ai = getGeminiClient();

    // Kick off Visual Explanation in parallel if recommended
    let visualPromise: Promise<any> | null = null;
    if (route.isVisualExplanation) {
      res.write(`data: ${JSON.stringify({
        type: "visual_explanation_start",
        visualType: route.visualType || "diagram",
        title: route.visualSubject || "Visual Explanation",
      })}\n\n`);

      visualPromise = generateVisualExplanation({
        prompt,
        visualType: route.visualType,
        visualSubject: route.visualSubject,
        language: route.language,
      });
    }

    // Construct comprehensive ChatGPT-level system instruction
    const currentYear = new Date().getFullYear();
    const currentDateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const baseSystemInstruction = `You are CHAT GPR, a world-class, ultra-intelligent, friendly, and articulate AI conversational assistant and tutor modeled after the world's most advanced AI assistants (ChatGPT / GPT-4o).

Knowledge & Real-time Context:
- Current Year: ${currentYear}
- Today's Date: ${currentDateStr}
- Always be aware that the current year is ${currentYear}. Do NOT state that we are in 2024 or older years.

Your mission is to deliver deeply insightful, exceptionally helpful, beautifully formatted, and natural conversational answers across all domains.

### 🌟 Core Communication & Personality:
1. **Conversational Excellence & Tone**:
   - Speak with warmth, professional confidence, intelligence, clarity, and genuine empathy.
   - Be direct: start with the immediate answer or solution, followed by clear explanations, structured breakdowns, real-world examples, and actionable advice.
   - Avoid generic robotic filler or redundant disclaimers (e.g. do NOT say "As an AI model..."). Jump straight into the high-value answer.

2. **Universal Multilingual Mastery (Support All World Languages)**:
   - **Automatic Language Detection & Mirroring**: Always respond in the EXACT same language (or dialect) that the user asks in, unless explicitly requested to translate or answer in another language.
   - **Flawless Global Fluency**: Native-level vocabulary, pristine grammar, natural idioms, and correct cultural nuances across all major world languages including:
     - 🇰🇭 **Khmer (ភាសាខ្មែរ)**: Natural, highly fluent, grammatically pristine, and polite Khmer (ភាសាខ្មែររលូន គួរសម និងត្រឹមត្រូវតាមក្បួនខ្នាត)។
     - 🇬🇧/🇺🇸 **English**: Articulate, precise, rich vocabulary, and crisp phrasing.
     - 🇨🇳 **Chinese (中文 / 简体 / 繁體)**: Fluent Putonghua/Mandarin and Traditional Chinese with natural syntax and terminology.
     - 🇻🇳 **Vietnamese (Tiếng Việt)**: Natural tone markers, proper honorifics, and accurate modern phrasing.
     - 🇹🇭 **Thai (ภาษาไทย)**: Polite particles (ครับ/ค่ะ), natural sentence structure, and standard grammar.
     - 🇯🇵 **Japanese (日本語)**: Natural keigo (丁寧語/尊敬語/謙譲語), kanji/kana usage, and respectful tone.
     - 🇰🇷 **Korean (한국어)**: Natural honorific levels (해요체/하십시오체), accurate vocabulary, and standard grammar.
     - 🇫🇷 **French (Français)**, 🇪🇸 **Spanish (Español)**, 🇩🇪 **German (Deutsch)**, 🇷🇺 **Russian (Русский)**, 🇸🇦 **Arabic (العربية)**, 🇮🇳 **Hindi (हिन्दी)**, 🇮🇩 **Indonesian (Bahasa Indonesia)**, 🇵🇭 **Tagalog/Filipino**, 🇲🇲 **Burmese (မြန်မာဘာသာ)**, 🇱🇦 **Lao (ພາສາລາວ)**, and every other regional or international language.
   - **Seamless Code-Switching & Translation**: Effortlessly handle mixed languages (e.g. Khmer-English, Singlish, Spanglish) and provide high-accuracy translations preserving exact tone, context, and nuance.

3. **Masterful Markdown Formatting**:
   - Structure long explanations with clear hierarchical Markdown headers (\`##\`, \`###\`).
   - Use scannable bullet points with bold keywords (\`- **ចំណុចសំខាន់៖** ...\`).
   - Use comparison tables (\`| Header 1 | Header 2 |\`) when comparing options, frameworks, or concepts.
   - Highlight key terms with **bold** or *italics* for effortless reading.

4. **Domain Excellence**:
   - 💻 **Coding & Software Engineering**: Provide clean, modular, production-ready code with language tags, type safety, best practices, step-by-step explanations of how it works, and common edge cases.
   - 📐 **Math, Science & STEM**: Break down problems step-by-step with intuitive reasoning. Write mathematical formulas using proper LaTeX notation (\`$...$\` inline or \`$$...$$\` display blocks).
   - 🔍 **Vision & Multimodal Analysis**: Carefully inspect attached images, read all visible Khmer & English text (OCR), describe diagrams, solve worksheets, and diagnose UI/code screenshots with precision.
   - ✍️ **Writing, Business & Creativity**: Craft compelling essays, business proposals, professional emails, summaries, and creative stories with nuance and depth.
   - 🌐 **Real-time Research**: Provide up-to-date, objective, and well-cited information when web search is enabled.

5. **Visual Explanations & Diagrams**:
   - When a concept is explained with an educational diagram or flowchart, provide a detailed textual breakdown explaining each component and stage step-by-step under '### ពន្យល់ពីរូបភាព'.

6. **Web Search & Citation Excellence** (when search results are provided):
   - NEVER simply copy or paraphrase search result snippets verbatim.
   - Understand the information from multiple sources, cross-reference, then synthesize a clear, accurate answer.
   - Cite sources inline using [1], [2], etc. immediately after the claim they support.
   - Prioritize sources marked [⭐ Official/Primary] or [✓ Reliable] for factual accuracy.
   - If sources disagree on facts, clearly note the discrepancy and explain which source is more authoritative.
   - If search results are insufficient to answer confidently, say so honestly — do NOT fabricate information.
   - At the end of your answer, include a concise 'Sources:' section listing the 3-5 most relevant URLs.
   - Answer in the SAME language as the user asked.`;

    // Format previous conversation history
    const contents: any[] = [];
    const recentMessages = messages.slice(-12);
    for (const msg of recentMessages) {
      const parts: any[] = [];
      if (msg.attachments && msg.attachments.length > 0) {
        parts.push(...formatAttachmentsForGemini(msg.attachments));
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (parts.length > 0) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        });
      }
    }

    // Perform web search if search intent is active
    let searchContext = "";
    if (route.isWebSearch) {
      try {
        console.log(`[WebSearch] Searching for: ${prompt.slice(0, 50)}`);
        const searchResults = await searchWeb(prompt, 5);
        searchContext = formatSearchResults(searchResults);
        console.log(`[WebSearch] Found ${searchResults.length} results, context length: ${searchContext.length}`);
      } catch (searchErr) {
        console.warn("[WebSearch] Error:", searchErr);
      }
    }

    // Add current user turn with search context if available
    const currentParts: any[] = [];
    if (attachments && attachments.length > 0) {
      currentParts.push(...formatAttachmentsForGemini(attachments));
    }
    if (prompt) {
      const promptWithSearch = searchContext ? prompt + searchContext : prompt;
      console.log(`[WebSearch] Prompt length: ${prompt.length}, With search: ${promptWithSearch.length}`);
      currentParts.push({ text: promptWithSearch });
    }
    contents.push({
      role: "user",
      parts: currentParts,
    });

    // Build configuration
    const config: any = {
      systemInstruction: `${baseSystemInstruction}\n\nSpecific Request Directive:\n${route.systemDirective}`,
      temperature: route.isMathOrReasoning || route.isCoding ? 0.2 : 0.7,
    };

    // ═══════════════════════════════════════════════════════════════
    // AI ROUTER: Multi-provider cascade with circuit breaker
    // Gemini (6 models) → Pollinations.ai (free) → Q8_K_XL → Knowledge Engine
    // ═══════════════════════════════════════════════════════════════
    let groundingSources: any[] = [];
    let fullText = "";

    const routerResult = await routeAndStream({
      contents,
      config,
      systemInstruction: baseSystemInstruction,
      prompt,
      history: messages.slice(-8),
      timeoutMs: 30_000,
      callbacks: {
        onToken: (token) => {
          fullText += token;
          res.write(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`);
        },
        onModelInfo: (model, isFallback) => {
          res.write(`data: ${JSON.stringify({ type: "model_info", modelUsed: model, isFallback })}\n\n`);
        },
      },
    });

    fullText = routerResult.fullText;

    // If visual explanation was requested, await and stream the ready visual
    if (visualPromise) {
      try {
        const visual = await visualPromise;
        if (visual) {
          res.write(`data: ${JSON.stringify({ type: "visual_explanation_ready", visual })}\n\n`);
        }
      } catch (visErr) {
        console.warn("[CHAT GPR] Visual explanation generation error:", visErr);
        res.write(`data: ${JSON.stringify({
          type: "visual_explanation_error",
          error: "Could not generate visual diagram for this question.",
        })}\n\n`);
      }
    }

    if (groundingSources.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "grounding", sources: groundingSources })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done", fullText })}\n\n`);
  } catch (err: any) {
    console.error("[Chat Stream Error]", err);
    res.write(`data: ${JSON.stringify({
      type: "error",
      error: parseGeminiError(err),
    })}\n\n`);
  } finally {
    res.end();
  }
});

// 2. Dedicated Visual Explanation Generation & Regeneration Endpoint
app.post("/api/visual-explanation/generate", async (req, res) => {
  const { prompt, visualType, visualSubject, language = "km" } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  try {
    const visual = await generateVisualExplanation({
      prompt,
      visualType,
      visualSubject,
      language,
    });
    return res.json({ success: true, visual });
  } catch (err: any) {
    console.error("[Visual Explanation Endpoint Error]", err);
    return res.status(500).json({
      success: false,
      error: parseGeminiError(err),
    });
  }
});

// 3. Dedicated Image Generation Endpoint
app.post("/api/generate-image", async (req, res) => {
  const {
    prompt,
    aspectRatio = "1:1",
    imageSize = "2K",
    inputImageBase64,
    inputImageMimeType,
    isEditMode = false,
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  const result = await generateAIImage({
    prompt,
    aspectRatio,
    imageSize,
    inputImageBase64,
    inputImageMimeType,
    isEditMode,
  });

  return res.json(result);
});

// 4. Automatic Conversation Title Generation Endpoint
app.post("/api/title", async (req, res) => {
  const { prompt = "", response = "" } = req.body;
  if (!prompt) {
    return res.json({ title: "New Conversation" });
  }

  const cleanPrompt = prompt.trim().slice(0, 30);

  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Create an ultra-short, engaging, clean title (2 to 5 words max) in the language of the prompt (Khmer or English) for this conversation:
User: "${prompt.slice(0, 150)}"
AI: "${response.slice(0, 150)}"
Rules:
- No quotation marks.
- No punctuation at the end.
- Strictly 2-5 words.`,
    });

    const title = result.text?.trim().replace(/^["']|["']$/g, "") || cleanPrompt;
    return res.json({ title: title.slice(0, 45) });
  } catch (err) {
    // Graceful fallback without crashing or throwing
    return res.json({ title: cleanPrompt || "Conversation" });
  }
});

// 5. Fallback AI Health Check Endpoint
app.post("/api/fallback/test", async (req, res) => {
  const { 
    endpointUrl = "https://hadadrjt-api.hf.space/v1", 
    modelName = "Q8_K_XL" 
  } = req.body;

  try {
    const result = await testQ8Health(endpointUrl, modelName);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.json({
      success: false,
      status: "ERROR",
      httpStatus: 0,
      contentType: "none",
      responseTimeMs: 0,
      model: modelName,
      endpoint: endpointUrl,
      message: "Health check encountered an unexpected error",
      error: err?.message || "Unknown error",
      isReady: false,
    });
  }
});

// ============ AI AGENT ENDPOINTS ============

// Agent CRUD
app.get("/api/agents", (req, res) => {
  const agents = getAllAgents();
  // Don't expose tokens to frontend
  const safeAgents = agents.map(a => ({
    ...a,
    pageAccessToken: a.pageAccessToken ? "***" : undefined,
    botToken: a.botToken ? "***" : undefined,
    appSecret: a.appSecret ? "***" : undefined,
  }));
  res.json({ agents: safeAgents });
});

app.get("/api/agents/:id", (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({
    ...agent,
    pageAccessToken: agent.pageAccessToken ? "***" : undefined,
    botToken: agent.botToken ? "***" : undefined,
    appSecret: agent.appSecret ? "***" : undefined,
  });
});

app.post("/api/agents", (req, res) => {
  const { platform, pageAccessToken, botToken, appSecret, verifyToken, welcomeMessage, systemPrompt } = req.body;
  
  if (!platform || !"facebook".includes(platform) && !"telegram".includes(platform)) {
    return res.status(400).json({ error: "Invalid platform" });
  }

  const agent = createAgent({
    platform,
    enabled: false,
    humanTakeover: false,
    pageAccessToken,
    botToken,
    appSecret,
    verifyToken: verifyToken || `verify_${Date.now()}`,
    welcomeMessage: welcomeMessage || "👋 Welcome! How can I help you?",
    systemPrompt,
  });

  res.json({ agent: { ...agent, pageAccessToken: "***", botToken: "***", appSecret: "***" } });
});

app.put("/api/agents/:id", (req, res) => {
  const { pageAccessToken, botToken, appSecret, ...updates } = req.body;
  const agent = updateAgent(req.params.id, {
    ...updates,
    ...(pageAccessToken && { pageAccessToken }),
    ...(botToken && { botToken }),
    ...(appSecret && { appSecret }),
  });
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: { ...agent, pageAccessToken: "***", botToken: "***", appSecret: "***" } });
});

app.delete("/api/agents/:id", (req, res) => {
  const deleted = deleteAgent(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Agent not found" });
  res.json({ success: true });
});

app.post("/api/agents/:id/toggle", (req, res) => {
  const agent = toggleAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: { ...agent, pageAccessToken: "***", botToken: "***", appSecret: "***" } });
});

app.post("/api/agents/:id/human-takeover", (req, res) => {
  const agent = toggleHumanTakeover(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: { ...agent, pageAccessToken: "***", botToken: "***", appSecret: "***" } });
});

app.get("/api/agents/:id/conversations", (req, res) => {
  const convs = getAgentConversations(req.params.id);
  res.json({ conversations: convs });
});

// Reply to a Telegram/Facebook user from the dashboard
app.post("/api/agents/:id/reply", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  try {
    if (agent.platform === "telegram" && agent.botToken) {
      // Send via Telegram Bot API
      const response = await fetch(`${TELEGRAM_API}/bot${agent.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userId,
          text: message.slice(0, 4096),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        // Add admin message to conversation
        const { addMessageToConversation } = await import("./src/services/agentStorage.js");
        const convs = getAgentConversations(agent.id);
        const conv = convs.find((c) => c.userId === userId);
        if (conv) {
          addMessageToConversation(conv.id, "assistant", message);
        }
        res.json({ success: true });
      } else {
        console.error("[Telegram] Send error:", data.description);
        res.status(500).json({ error: data.description || "Failed to send message" });
      }
    } else if (agent.platform === "facebook" && agent.pageAccessToken) {
      // Send via Facebook Graph API
      const { sendFacebookMessage } = await import("./src/services/facebookAgent.js");
      const sent = await sendFacebookMessage(userId, agent.pageAccessToken, message);
      if (sent) {
        const { addMessageToConversation } = await import("./src/services/agentStorage.js");
        const convs = getAgentConversations(agent.id);
        const conv = convs.find((c) => c.userId === userId);
        if (conv) {
          addMessageToConversation(conv.id, "assistant", message);
        }
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    } else {
      res.status(400).json({ error: "Agent not configured for messaging" });
    }
  } catch (err: any) {
    console.error("[Agent Reply Error]", err.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Update Agent Settings
app.put("/api/agents/:id", (req, res) => {
  const { welcomeMessage, systemPrompt, commentReplyPrompt, autoPostPrompt, botToken, pageAccessToken } = req.body;
  const updates: any = {};
  if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;
  if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
  if (commentReplyPrompt !== undefined) updates.commentReplyPrompt = commentReplyPrompt;
  if (autoPostPrompt !== undefined) updates.autoPostPrompt = autoPostPrompt;
  if (botToken !== undefined) updates.botToken = botToken;
  if (pageAccessToken !== undefined) updates.pageAccessToken = pageAccessToken;

  const updated = updateAgent(req.params.id, updates);
  if (updated) {
    res.json({ success: true, agent: { ...updated, botToken: updated.botToken ? "***" : undefined, pageAccessToken: updated.pageAccessToken ? "***" : undefined } });
  } else {
    res.status(404).json({ error: "Agent not found" });
  }
});

// ============ FACEBOOK WEBHOOK ============

app.get("/api/webhook/facebook", (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const agent = getFacebookAgent();
  if (!agent?.verifyToken) {
    return res.status(403).json({ error: "Facebook agent not configured" });
  }

  const result = verifyFacebookWebhook(mode, token, challenge, agent.verifyToken);
  if (result) {
    res.send(result);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

app.post("/api/webhook/facebook", async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  const agent = getFacebookAgent();
  if (!agent?.enabled || !agent.pageAccessToken) return;

  // Verify signature if app secret is configured
  if (agent.appSecret) {
    const signature = req.headers["x-hub-signature-256"] as string;
    const body = JSON.stringify(req.body);
    // Note: In production, use proper signature verification
  }

  try {
    await processFacebookMessage(req.body, agent, async (message, history) => {
      // Use AI Router with fallbacks for maximum reliability
      let fullText = "";
      const result = await routeAndStream({
        contents: history.map(h => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })).concat([{ role: "user", parts: [{ text: message }] }]),
        config: {
          systemInstruction: agent.systemPrompt || "You are a helpful AI assistant for a phone store. Answer concisely and friendly in Khmer when the user writes in Khmer.",
          temperature: 0.7,
        },
        systemInstruction: agent.systemPrompt || "You are a helpful AI assistant.",
        prompt: message,
        history,
        callbacks: {
          onToken: (token) => { fullText += token; },
        },
        timeoutMs: 15_000,
      });
      return result.fullText || "I'm sorry, I couldn't generate a response.";
    });
  } catch (err) {
    console.error("[Facebook Webhook Error]", err);
  }
});

app.post("/api/agents/facebook/setup", async (req, res) => {
  const agent = getFacebookAgent();
  if (!agent?.pageAccessToken) {
    return res.status(400).json({ error: "Facebook agent not configured" });
  }

  const baseUrl = getBaseUrl(req);
  const webhookUrl = `${baseUrl}/api/webhook/facebook`;
  const success = await setupFacebookWebhook(agent.pageAccessToken, webhookUrl, agent.verifyToken!);

  if (success) {
    updateAgent(agent.id, { webhookUrl });
    res.json({ success: true, webhookUrl });
  } else {
    res.status(500).json({ error: "Failed to setup webhook" });
  }
});

app.post("/api/agents/facebook/verify-token", async (req, res) => {
  const { pageAccessToken } = req.body;
  if (!pageAccessToken) {
    return res.status(400).json({ error: "Page access token required" });
  }

  const pageInfo = await getFacebookPageInfo(pageAccessToken);
  if (pageInfo) {
    res.json({ valid: true, page: pageInfo });
  } else {
    res.json({ valid: false, error: "Invalid token or page not found" });
  }
});

// ============ FACEBOOK AUTO-POST ============

app.post("/api/agents/facebook/post", async (req, res) => {
  const agent = getFacebookAgent();
  if (!agent?.pageAccessToken) {
    return res.status(400).json({ error: "Facebook agent not configured" });
  }    const { message, link, imageUrl, useAI, aiPrompt } = req.body;
    const effectivePrompt = aiPrompt || (useAI ? agent.autoPostPrompt : undefined);
    if (!message && !effectivePrompt) {
      return res.status(400).json({ error: "Message or AI prompt is required" });
    }

  try {
    let postMessage = message;

    // If useAI is true or effectivePrompt exists, generate the post content using AI Router
    if (effectivePrompt) {
      const { routeAndStream } = await import("./src/services/aiRouter.js");
      let fullText = "";
      await routeAndStream({
        contents: [{ role: "user", parts: [{ text: `Generate a professional Facebook post for this topic: ${effectivePrompt}. Keep it engaging, use emojis, and write in Khmer if the prompt is in Khmer. Do NOT include quotes around the post.` }] }],
        config: { temperature: 0.8 },
        systemInstruction: agent.autoPostPrompt || "You are a social media expert. Generate engaging Facebook posts.",
        prompt: effectivePrompt,
        history: [],
        callbacks: { onToken: (token) => { fullText += token; } },
        timeoutMs: 15000,
      });
      postMessage = fullText || message;
    }

    if (!postMessage) {
      return res.status(400).json({ error: "Could not generate post content" });
    }

    const result = await createFacebookPost({
      pageAccessToken: agent.pageAccessToken,
      message: postMessage,
      link,
      imageUrl,
    });

    if (result.success) {
      console.log(`[Facebook] Post created: ${result.postId}`);
      res.json({ success: true, postId: result.postId, message: postMessage });
    } else {
      res.status(500).json({ error: result.error || "Failed to create post" });
    }
  } catch (err: any) {
    console.error("[Facebook] Post error:", err.message);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ============ FACEBOOK COMMENT WEBHOOK ============

app.get("/api/webhook/facebook/comments", (req, res) => {
  // Comment webhook verification uses the same GET verification as messages
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const agent = getFacebookAgent();
  if (!agent?.verifyToken) {
    return res.status(403).json({ error: "Facebook agent not configured" });
  }

  const result = verifyFacebookWebhook(mode, token, challenge, agent.verifyToken);
  if (result) {
    res.send(result);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

app.post("/api/webhook/facebook/comments", async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  const agent = getFacebookAgent();
  if (!agent?.enabled || !agent.pageAccessToken) return;

  try {
    await processFacebookComment(req.body, agent, async (message, history) => {
      const { routeAndStream } = await import("./src/services/aiRouter.js");
      let fullText = "";
      const result = await routeAndStream({
        contents: history.map(h => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })).concat([{ role: "user", parts: [{ text: message }] }]),
        config: { temperature: 0.7 },
        systemInstruction: agent.commentReplyPrompt || agent.systemPrompt || "You are a helpful AI assistant. Reply to comments concisely and friendly. Answer in Khmer if the comment is in Khmer.",
        prompt: message,
        history,
        callbacks: { onToken: (token) => { fullText += token; } },
        timeoutMs: 15000,
      });
      return result.fullText || "Thanks for your comment!";
    });
  } catch (err) {
    console.error("[Facebook Comment Webhook Error]", err);
  }
});

// ============ TELEGRAM WEBHOOK ============

app.post("/api/webhook/telegram", async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  const agent = getTelegramAgent();
  if (!agent?.enabled || !agent.botToken) return;

  try {
    await processTelegramMessage(req.body, agent, async (message, history, imageBase64?) => {
      const ai = getGeminiClient();

      // Auto-detect search intent for current info (prices, news, availability)
      let searchContext = "";
      const searchKeywords = ["តម្លៃ", "price", "តម្លៃរូបិយវត្ថុ", "ថ្ងៃនេះ", "today", "ឥឡូវ", "now", "2024", "2025", "2026", "new", "ថ្មី", "release", "ចេញ", "ទើប", "just", "available", "ប្រើប្រាស់", "use", "spec", "specs", "features", "លក្ខណៈ", "camera", "កាមេរ៉ា", "battery", "ថ្ម", "screen", "អេក្រង់", "storage", "ផ្ទុក", "ram", "processor", "CPU", "GPU", "iPhone", "Samsung", "Galaxy", "Pixel", "Xiaomi", "OPPO", "vivo", "Huawei"];
      const needsSearch = searchKeywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()));
      
      if (needsSearch && !imageBase64) {
        try {
          console.log(`[Telegram] Searching web for: ${message.slice(0, 50)}`);
          const searchResults = await searchWeb(message, 5);
          if (searchResults.length > 0) {
            searchContext = formatSearchResults(searchResults);
            console.log(`[Telegram] Found ${searchResults.length} search results`);
          }
        } catch (searchErr) {
          console.warn("[Telegram] Web search failed:", searchErr);
        }
      }

      const contents: any[] = history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      }));

      // Build user message parts
      const userParts: any[] = [];
      
      // Add image if present
      if (imageBase64) {
        userParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        });
        console.log(`[Telegram] Image attached for analysis (${(imageBase64.length / 1024).toFixed(0)}KB base64)`);
      }
      
      // Add text (with search context if available)
      const finalMessage = searchContext
        ? `${message}\n\n---\nព័ត៌មានស្វែងរកបាន៖\n${searchContext}\n\n---\nសូមឆ្លើយតបដោយផ្អែកលើព័ត៌មានខាងលើ និងចំណេះដឹងរបស់អ្នក។ ប្រសិនបើព័ត៌មានមិនគ្រប់គ្រាន់ សូមប្រើចំណេះដឹងរបស់អ្នក។ ឆ្លើយជាភាសាដែលអ្នកប្រើប្រើប្រាស់។`
        : message;
      userParts.push({ text: finalMessage });
      contents.push({ role: "user", parts: userParts });

      const systemInstruction = imageBase64
        ? (agent.systemPrompt || "You are a helpful AI assistant with vision capabilities. Analyze images carefully and describe what you see in detail. Answer in the same language as the user's text prompt. If no text prompt is provided, describe the image comprehensively.")
        : (agent.systemPrompt || "You are a helpful AI assistant for a phone store. Answer concisely and friendly in Khmer when the user writes in Khmer. Use web search results when available for current prices and information.");

      const models = imageBase64
        ? ["gemini-3.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"] // Vision-capable models
        : ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

      for (const modelName of models) {
        try {
          const result = await ai.models.generateContent({
            model: modelName,
            contents,
            config: { systemInstruction, temperature: 0.7 },
          });
          if (result.text) return result.text;
        } catch (modelErr: any) {
          const status = modelErr?.status || modelErr?.statusCode;
          console.error(`[Telegram] Model ${modelName} failed (${status}):`, modelErr?.message?.slice(0, 100));
          if (status !== 503 && status !== 429) break; // Non-retryable error
        }
      }

      return imageBase64
        ? "សូមអភ័យទោស មិនអាចវិភាគរូបភាពបាននៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។"
        : "I'm experiencing high demand right now. Please try again in a moment.";
    });
  } catch (err) {
    console.error("[Telegram Webhook Error]", err);
  }
});

app.post("/api/agents/telegram/setup", async (req, res) => {
  const agent = getTelegramAgent();
  if (!agent?.botToken) {
    return res.status(400).json({ error: "Telegram agent not configured" });
  }

  const baseUrl = getBaseUrl(req);
  const webhookUrl = `${baseUrl}/api/webhook/telegram`;
  const success = await setupTelegramWebhook(agent.botToken, webhookUrl);

  if (success) {
    updateAgent(agent.id, { webhookUrl });
    res.json({ success: true, webhookUrl });
  } else {
    res.status(500).json({ error: "Failed to setup webhook" });
  }
});

app.post("/api/agents/telegram/verify-token", async (req, res) => {
  const { botToken } = req.body;
  if (!botToken) {
    return res.status(400).json({ error: "Bot token required" });
  }

  const botInfo = await getTelegramBotInfo(botToken);
  if (botInfo) {
    res.json({ valid: true, bot: botInfo });
  } else {
    res.json({ valid: false, error: "Invalid bot token" });
  }
});

// Production and Development Server Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CHAT GPR] Server running at http://localhost:${PORT}`);
  });
}

startServer();
