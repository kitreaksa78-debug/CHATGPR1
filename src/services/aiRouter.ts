/**
 * AI Router - Speed-Optimized Multi-Provider AI Router
 * 
 * Maximum speed with:
 * - Fast Gemini models first (flash-lite = fastest)
 * - 8s timeout per model (instant fallback)
 * - Circuit breaker for failed providers
 * - Pollinations.ai free backup
 * - Knowledge engine last resort
 */

import { getGeminiClient, formatAttachmentsForGemini } from "./gemini.js";
import { getApiKeyManager } from "./apiKeyManager.js";
import { getResponseCache } from "./responseCache.js";

// ─── Types ──────────────────────────────────────────────────────────────

export type ProviderStatus = "healthy" | "degraded" | "unavailable";

export interface ProviderHealth {
  provider: string;
  model: string;
  status: ProviderStatus;
  lastError?: string;
  lastErrorTime?: number;
  errorCount: number;
  successCount: number;
  lastSuccessTime?: number;
  cooldownUntil?: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onModelInfo?: (model: string, isFallback: boolean) => void;
}

export interface RouterOptions {
  contents: any[];
  config: any;
  systemInstruction: string;
  prompt: string;
  history: Array<{ role: string; content: string }>;
  callbacks: StreamCallbacks;
  timeoutMs?: number;
}

// ─── Speed-Optimized Configuration ──────────────────────────────────────

// Models ordered by SPEED (fastest first). flash-lite is the fastest Gemini model.
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];

const CIRCUIT_BREAKER_THRESHOLD = 2; // Trip after 2 failures (fast)
const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000; // 30s cooldown (fast recovery)

// ─── Health State ────────────────────────────────────────────────────────

const healthMap = new Map<string, ProviderHealth>();

function getHealth(provider: string, model: string): ProviderHealth {
  const key = `${provider}:${model}`;
  if (!healthMap.has(key)) {
    healthMap.set(key, {
      provider,
      model,
      status: "healthy",
      errorCount: 0,
      successCount: 0,
    });
  }
  return healthMap.get(key)!;
}

function recordSuccess(provider: string, model: string) {
  const h = getHealth(provider, model);
  h.status = "healthy";
  h.errorCount = 0;
  h.successCount++;
  h.lastSuccessTime = Date.now();
  h.lastError = undefined;
  h.cooldownUntil = undefined;
}

function recordFailure(provider: string, model: string, error: string) {
  const h = getHealth(provider, model);
  h.errorCount++;
  h.lastError = error;
  h.lastErrorTime = Date.now();

  if (h.errorCount >= CIRCUIT_BREAKER_THRESHOLD) {
    h.status = "unavailable";
    h.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    console.log(`[AIRouter] 🔌 Circuit breaker TRIPPED: ${provider}:${model} — cooldown ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`);
  } else if (h.errorCount >= 1) {
    h.status = "degraded";
  }
}

function isAvailable(provider: string, model: string): boolean {
  const h = getHealth(provider, model);
  if (h.status === "unavailable" && h.cooldownUntil) {
    if (Date.now() < h.cooldownUntil) return false;
    h.status = "degraded";
    h.cooldownUntil = undefined;
    console.log(`[AIRouter] ✅ Cooldown expired: ${provider}:${model} — retrying`);
  }
  return true;
}

// ─── Error Classification ────────────────────────────────────────────────

function isRateLimitError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.httpStatusCode || 0;
  return (
    status === 429 || status === 403 ||
    msg.includes("429") || msg.includes("rate limit") ||
    msg.includes("resource_exhausted") || msg.includes("quota") ||
    msg.includes("billing")
  );
}

// ─── Gemini Provider ─────────────────────────────────────────────────────

async function* streamGemini(
  model: string,
  contents: any[],
  config: any,
  timeoutMs: number
): AsyncGenerator<string> {
  const ai = getGeminiClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) yield text;
    }
  } finally {
    clearTimeout(timer);
  }
}

async function tryGeminiModel(
  model: string,
  contents: any[],
  config: any,
  timeoutMs: number
): Promise<AsyncGenerator<string>> {
  if (!isAvailable("gemini", model)) {
    throw new Error(`${model} in cooldown`);
  }

  try {
    const gen = streamGemini(model, contents, config, timeoutMs);
    const firstChunk = await gen.next();      if (firstChunk.done) {
        throw new Error("Empty response or function call");
      }

    return (async function* () {
      yield firstChunk.value;
      yield* gen;
    })();
  } catch (err: any) {
    recordFailure("gemini", model, err.message || "unknown");
    throw err;
  }
}

// ─── Pollinations.ai Provider ────────────────────────────────────────────

async function* streamPollinations(
  prompt: string,
  systemInstruction: string,
  history: Array<{ role: string; content: string }>,
  model: string,
  timeoutMs: number
): AsyncGenerator<string> {
  const url = `https://text.pollinations.ai/${model}`;
  
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-6).map(h => ({
      role: h.role === "assistant" ? "assistant" as const : "user" as const,
      content: h.content,
    })),
    { role: "user" as const, content: prompt },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model,
        stream: true,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Pollinations HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
          
          if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
            throw new Error("HTML response rejected");
          }

          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || parsed.content || "";
              if (token && typeof token === "string") yield token;
            } catch {
              // Non-JSON chunk, skip
            }
          } else {
            try {
              const parsed = JSON.parse(trimmed);
              const token = parsed.choices?.[0]?.message?.content || parsed.content || "";
              if (token && typeof token === "string") yield token;
            } catch {
              if (trimmed.length > 0 && !trimmed.startsWith("<")) {
                yield trimmed;
              }
            }
          }
        }
      }
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        const content = parsed.choices?.[0]?.message?.content || parsed.content || text;
        if (content) yield content;
      } catch {
        if (text && !text.startsWith("<")) yield text;
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

async function tryPollinations(
  prompt: string,
  systemInstruction: string,
  history: Array<{ role: string; content: string }>,
  model: string,
  timeoutMs: number
): Promise<AsyncGenerator<string>> {
  if (!isAvailable("pollinations", model)) {
    throw new Error(`Pollinations ${model} in cooldown`);
  }

  try {
    const gen = streamPollinations(prompt, systemInstruction, history, model, timeoutMs);
    const firstChunk = await gen.next();
    
    if (firstChunk.done || !firstChunk.value) {
      throw new Error("Empty response from Pollinations");
    }

    return (async function* () {
      yield firstChunk.value;
      yield* gen;
    })();
  } catch (err: any) {
    recordFailure("pollinations", model, err.message || "unknown");
    throw err;
  }
}

// ─── Main Router ─────────────────────────────────────────────────────────

export async function routeAndStream(options: RouterOptions): Promise<{
  success: boolean;
  modelUsed: string;
  isFallback: boolean;
  fullText: string;
  error?: string;
}> {
  const {
    contents,
    config,
    prompt,
    history,
    callbacks,
    timeoutMs = 8_000, // 8 seconds per model (SPEED OPTIMIZED)
  } = options;

  let fullText = "";
  const { onToken, onModelInfo } = callbacks;

  // ═══════════════════════════════════════════════════════════════════
  // TIER 1: Gemini Models (Primary — fastest models first)
  // ═══════════════════════════════════════════════════════════════════
  for (const model of GEMINI_MODELS) {
    if (!isAvailable("gemini", model)) continue;
    
    try {
      console.log(`[AIRouter] ⚡ Trying Gemini: ${model} (${timeoutMs}ms timeout)`);
      const startTime = Date.now();
      const gen = await tryGeminiModel(model, contents, config, timeoutMs);
      
      for await (const chunk of gen) {
        fullText += chunk;
        onToken(chunk);
      }

      if (fullText.length > 0) {
        const elapsed = Date.now() - startTime;
        recordSuccess("gemini", model);
        console.log(`[AIRouter] ✅ Gemini ${model} succeeded in ${elapsed}ms (${fullText.length} chars)`);
        onModelInfo?.(model, false);
        return { success: true, modelUsed: model, isFallback: false, fullText };
      }
    } catch (err: any) {
      console.log(`[AIRouter] ❌ Gemini ${model}: ${err.message?.slice(0, 60)}`);
      
      if (fullText.length > 0) {
        recordSuccess("gemini", model);
        onModelInfo?.(model, false);
        return { success: true, modelUsed: model, isFallback: false, fullText };
      }

      // If rate-limited, skip remaining Gemini models
      if (isRateLimitError(err)) {
        console.log(`[AIRouter] 🚫 Rate limited — skipping remaining Gemini`);
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2: Pollinations.ai (Free, no API key)
  // ═══════════════════════════════════════════════════════════════════
  const POLLINATIONS_MODELS = ["openai", "gemini"];
  
  for (const model of POLLINATIONS_MODELS) {
    try {
      console.log(`[AIRouter] ⚡ Trying Pollinations: ${model}`);
      const startTime = Date.now();
      const gen = await tryPollinations(prompt, config.systemInstruction || "", history, model, timeoutMs);
      
      for await (const chunk of gen) {
        fullText += chunk;
        onToken(chunk);
      }

      if (fullText.length > 0) {
        const elapsed = Date.now() - startTime;
        recordSuccess("pollinations", model);
        console.log(`[AIRouter] ✅ Pollinations ${model} succeeded in ${elapsed}ms`);
        onModelInfo?.(`Pollinations ${model}`, true);
        return { success: true, modelUsed: `Pollinations ${model}`, isFallback: true, fullText };
      }
    } catch (err: any) {
      console.log(`[AIRouter] ❌ Pollinations ${model}: ${err.message?.slice(0, 60)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 3: Groq Cloud (Free Llama 3)
  // ═══════════════════════════════════════════════════════════════════
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (GROQ_API_KEY) {
    const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
    
    for (const model of GROQ_MODELS) {
      try {
        console.log(`[AIRouter] ⚡ Trying Groq: ${model}`);
        const startTime = Date.now();
        
        const messages = [
          { role: "system", content: config.systemInstruction || "You are a helpful AI assistant." },
          ...history.slice(-6).map(h => ({
            role: h.role === "assistant" ? "assistant" as const : "user" as const,
            content: h.content,
          })),
          { role: "user" as const, content: prompt },
        ];

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              messages,
              stream: true,
              temperature: 0.7,
              max_tokens: 2048,
            }),
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (!response.ok) {
            const errText = await response.text().catch(() => "");
            throw new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 100)}`);
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
              
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content || "";
                  if (token && typeof token === "string") {
                    fullText += token;
                    onToken(token);
                  }
                } catch {}
              }
            }
          }

          if (fullText.length > 0) {
            const elapsed = Date.now() - startTime;
            recordSuccess("groq", model);
            console.log(`[AIRouter] ✅ Groq ${model} succeeded in ${elapsed}ms`);
            onModelInfo?.(`Groq ${model}`, true);
            return { success: true, modelUsed: `Groq ${model}`, isFallback: true, fullText };
          }
        } catch (err: any) {
          clearTimeout(timer);
          throw err;
        }
      } catch (err: any) {
        console.log(`[AIRouter] ❌ Groq ${model}: ${err.message?.slice(0, 60)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 4: Cohere (Free tier)
  // ═══════════════════════════════════════════════════════════════════
  const COHERE_API_KEY = process.env.COHERE_API_KEY;
  if (COHERE_API_KEY) {
    try {
      console.log(`[AIRouter] ⚡ Trying Cohere Command-R...`);
      const startTime = Date.now();
      
      const chatHistory = history.slice(-6).map(h => ({
        role: h.role === "assistant" ? "CHATBOT" as const : "USER" as const,
        message: h.content,
      }));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch("https://api.cohere.ai/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${COHERE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "command-r",
            message: prompt,
            chat_history: chatHistory,
            preamble: config.systemInstruction || "You are a helpful AI assistant.",
            stream: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Cohere HTTP ${response.status}: ${errText.slice(0, 100)}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.type === "content-delta" && parsed.delta?.message) {
                fullText += parsed.delta.message;
                onToken(parsed.delta.message);
              }
            } catch {}
          }
        }

        if (fullText.length > 0) {
          const elapsed = Date.now() - startTime;
          recordSuccess("cohere", "command-r");
          console.log(`[AIRouter] ✅ Cohere succeeded in ${elapsed}ms`);
          onModelInfo?.(`Cohere Command-R`, true);
          return { success: true, modelUsed: `Cohere Command-R`, isFallback: true, fullText };
        }
      } catch (err: any) {
        clearTimeout(timer);
        throw err;
      }
    } catch (err: any) {
      console.log(`[AIRouter] ❌ Cohere: ${err.message?.slice(0, 60)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 5: Q8_K_XL Fallback
  // ═══════════════════════════════════════════════════════════════════
  try {
    const { streamQ8Fallback } = await import("./q8Fallback.js");
    console.log(`[AIRouter] ⚡ Trying Q8_K_XL fallback...`);
    
    const q8Result = await streamQ8Fallback({
      endpointUrl: "https://hadadrjt-api.hf.space/v1",
      modelName: "Q8_K_XL",
      prompt,
      systemInstruction: config.systemInstruction || "",
      history,
      onToken: (token) => {
        fullText += token;
        onToken(token);
      },
      timeoutMs: 10_000,
    });

    if (q8Result.success && fullText.length > 0) {
      console.log(`[AIRouter] ✅ Q8_K_XL succeeded`);
      onModelInfo?.("Q8_K_XL", true);
      return { success: true, modelUsed: "Q8_K_XL", isFallback: true, fullText };
    }
  } catch (err: any) {
    console.log(`[AIRouter] ❌ Q8_K_XL: ${err.message?.slice(0, 60)}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIER 4: Knowledge Engine (Last resort — always works)
  // ═══════════════════════════════════════════════════════════════════
  try {
    const { synthesizeAutonomousResponse } = await import("./knowledgeEngine.js");
    console.log(`[AIRouter] 🧠 Using Knowledge Engine...`);
    
    const response = synthesizeAutonomousResponse(prompt, history);
    
    const words = response.split(/(\s+|\n+)/);
    for (let i = 0; i < words.length; i++) {
      if (words[i]) {
        fullText += words[i];
        onToken(words[i]);
        if (i % 3 === 0) {
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }

    console.log(`[AIRouter] ✅ Knowledge Engine responded`);
    onModelInfo?.("CHAT GPR Knowledge Engine", true);
    return { success: true, modelUsed: "Knowledge Engine", isFallback: true, fullText };
  } catch (err: any) {
    console.log(`[AIRouter] ❌ Knowledge Engine: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ABSOLUTE LAST RESORT
  // ═══════════════════════════════════════════════════════════════════
  const friendlyMessage = `សូមអភ័យទោស ប្រព័ន្ធ AI កំពុងមានបញ្ហាបណ្ដោះអាសន្ន។ សូមព្យាយាមម្ដងទៀតក្នុងរយៈពេលខ្លី។ 🙏\n\n*Sorry, the AI system is temporarily experiencing issues. Please try again in a moment.*`;

  fullText = friendlyMessage;
  onToken(friendlyMessage);
  onModelInfo?.("System Message", true);

  return {
    success: true,
    modelUsed: "Friendly Fallback",
    isFallback: true,
    fullText,
    error: "All providers exhausted",
  };
}

// ─── Health Check API ────────────────────────────────────────────────────

export function getProviderHealth(): ProviderHealth[] {
  return Array.from(healthMap.values());
}

export function getHealthyProviders(): string[] {
  const healthy: string[] = [];
  for (const [key, h] of healthMap) {
    if (h.status === "healthy" || (h.status === "degraded" && h.errorCount < CIRCUIT_BREAKER_THRESHOLD)) {
      healthy.push(key);
    }
  }
  return healthy;
}

export function resetCircuitBreaker(provider: string, model: string) {
  const h = getHealth(provider, model);
  h.status = "healthy";
  h.errorCount = 0;
  h.cooldownUntil = undefined;
  h.lastError = undefined;
}
