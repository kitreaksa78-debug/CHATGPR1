import { GoogleGenAI } from "@google/genai";
import { Attachment } from "../types.js";

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[CHAT GPR] GEMINI_API_KEY is not set in environment variables.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Format user uploaded attachments into Google GenAI inlineData or text parts
 */
export function formatAttachmentsForGemini(attachments: Attachment[]): any[] {
  const parts: any[] = [];

  for (const att of attachments) {
    if (att.base64Data) {
      if (att.type.startsWith("image/")) {
        parts.push({
          inlineData: {
            data: att.base64Data,
            mimeType: att.type || "image/jpeg",
          },
        });
      } else if (att.type === "application/pdf") {
        parts.push({
          inlineData: {
            data: att.base64Data,
            mimeType: "application/pdf",
          },
        });
      } else {
        // Text / code files
        try {
          const decoded = Buffer.from(att.base64Data, "base64").toString("utf-8");
          parts.push({
            text: `[Attached File: ${att.name}]\n\`\`\`\n${decoded}\n\`\`\``,
          });
        } catch {
          parts.push({
            inlineData: {
              data: att.base64Data,
              mimeType: att.type || "text/plain",
            },
          });
        }
      }
    }
  }

  return parts;
}
