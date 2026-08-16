import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getGeminiClient, formatAttachmentsForGemini } from "./src/services/gemini.js";
import { routeUserRequest } from "./src/services/router.js";
import { generateAIImage } from "./src/services/imageGeneration.js";
import { generateVisualExplanation } from "./src/services/visualExplanation.js";
import { parseGeminiError } from "./src/services/errorHelper.js";

dotenv.config();

const app = express();
const PORT = 3000;

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

// 1. Streaming Chat & Multimodal Routing Endpoint
app.post("/api/chat/stream", async (req, res) => {
  const { 
    messages = [], 
    prompt = "", 
    attachments = [], 
    webSearchEnabled = false 
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

  // Handle Pure Artistic Image Generation
  if (route.isImageGeneration) {
    try {
      res.write(`data: ${JSON.stringify({ type: "status", message: "កំពុងបង្កើតរូបភាព / Generating image..." })}\n\n`);
      const targetImagePrompt = route.cleanImagePrompt || prompt;
      const imageResult = await generateAIImage({
        prompt: targetImagePrompt,
      });

      if (imageResult.success && imageResult.imageUrl) {
        res.write(`data: ${JSON.stringify({
          type: "image_gen_success",
          imageUrl: imageResult.imageUrl,
          prompt: targetImagePrompt,
          revisedPrompt: imageResult.revisedPrompt,
        })}\n\n`);

        const isKhmer = route.language === "km";
        const replyText = isKhmer 
          ? "បាន! ខ្ញុំបានបង្កើតរូបភាពយ៉ាងស្រស់ស្អាតជូនអ្នករួចរាល់ហើយ។" 
          : "Here is your generated image.";
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
   - When a concept is explained with an educational diagram or flowchart, provide a detailed textual breakdown explaining each component and stage step-by-step under '### ពន្យល់ពីរូបភាព'.`;

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

    // Add current user turn
    const currentParts: any[] = [];
    if (attachments && attachments.length > 0) {
      currentParts.push(...formatAttachmentsForGemini(attachments));
    }
    if (prompt) {
      currentParts.push({ text: prompt });
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

    // Add Google Search grounding tool if search intent is active
    if (route.isWebSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // High availability model cascade with ultra-reliable lite models prioritized for instant response
    const TEXT_MODELS = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.7-flash",
    ];

    let streamCompleted = false;
    let lastError: any = null;
    let fullText = "";
    let groundingSources: any[] = [];

    for (const modelName of TEXT_MODELS) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            fullText += text;
            res.write(`data: ${JSON.stringify({ type: "token", text })}\n\n`);
          }

          // Extract search grounding metadata if available
          const searchChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (searchChunks && Array.isArray(searchChunks)) {
            for (const sc of searchChunks) {
              if (sc.web?.uri && sc.web?.title) {
                if (!groundingSources.some((s) => s.uri === sc.web.uri)) {
                  groundingSources.push({
                    title: sc.web.title,
                    uri: sc.web.uri,
                  });
                }
              }
            }
          }
        }

        streamCompleted = true;
        break;
      } catch (err: any) {
        console.warn(`[CHAT GPR] Model ${modelName} stream failed:`, err?.message || err);
        lastError = err;

        if (fullText.length > 0) {
          streamCompleted = true;
          break;
        }

        // If grounding failed on this model, attempt without grounding tool immediately
        if (config.tools && config.tools.length > 0) {
          try {
            console.log("[CHAT GPR] Retrying without tools for", modelName);
            const fallbackConfig = { ...config, tools: undefined };
            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents,
              config: fallbackConfig,
            });

            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                fullText += text;
                res.write(`data: ${JSON.stringify({ type: "token", text })}\n\n`);
              }
            }

            streamCompleted = true;
            break;
          } catch (fallbackErr) {
            console.warn("[CHAT GPR] Fallback without tools failed:", fallbackErr);
            lastError = fallbackErr;
          }
        }
      }
    }

    if (!streamCompleted && fullText.length === 0) {
      throw lastError || new Error("Failed to generate response across available models.");
    }

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
  const { prompt, aspectRatio = "1:1", inputImageBase64, inputImageMimeType } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  const result = await generateAIImage({
    prompt,
    aspectRatio,
    inputImageBase64,
    inputImageMimeType,
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
      model: "gemini-3.1-flash-lite",
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
