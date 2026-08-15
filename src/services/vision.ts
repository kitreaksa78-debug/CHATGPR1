import { Attachment } from "../types.js";

export function formatAttachmentsForGemini(attachments: Attachment[]): any[] {
  const parts: any[] = [];

  for (const att of attachments) {
    if (att.category === "image") {
      parts.push({
        inlineData: {
          mimeType: att.type || "image/png",
          data: att.base64Data,
        },
      });
    } else if (att.type === "application/pdf") {
      // Gemini natively accepts PDF inlineData!
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: att.base64Data,
        },
      });
    } else {
      // Text/Code/JSON/CSV/Markdown files
      try {
        const decodedText = Buffer.from(att.base64Data, "base64").toString("utf-8");
        parts.push({
          text: `\n[Attached File: "${att.name}" (${att.type})]:\n\`\`\`\n${decodedText}\n\`\`\`\n`,
        });
      } catch (e) {
        // fallback to inlineData
        parts.push({
          inlineData: {
            mimeType: att.type || "text/plain",
            data: att.base64Data,
          },
        });
      }
    }
  }

  return parts;
}
