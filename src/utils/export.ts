import { Conversation } from "../types.js";

export function exportAsMarkdown(conversation: Conversation) {
  let md = `# ${conversation.title}\n`;
  md += `*Exported from CHAT GPR on ${new Date().toLocaleString()}*\n\n---\n\n`;

  for (const msg of conversation.messages) {
    const roleName = msg.role === "user" ? "👤 User" : "✨ CHAT GPR";
    md += `### ${roleName} (${new Date(msg.createdAt).toLocaleTimeString()})\n\n`;

    if (msg.attachments && msg.attachments.length > 0) {
      md += `*Attachments: ${msg.attachments.map((a) => a.name).join(", ")}*\n\n`;
    }

    if (msg.content) {
      md += `${msg.content}\n\n`;
    }

    if (msg.generatedImage) {
      md += `![Generated Image: ${msg.generatedImage.prompt}](${msg.generatedImage.imageUrl})\n\n`;
    }

    md += `---\n\n`;
  }

  downloadFile(md, `${sanitizeFilename(conversation.title)}.md`, "text/markdown");
}

export function exportAsJson(conversation: Conversation) {
  const jsonStr = JSON.stringify(conversation, null, 2);
  downloadFile(jsonStr, `${sanitizeFilename(conversation.title)}.json`, "application/json");
}

export function exportAsText(conversation: Conversation) {
  let txt = `CHAT GPR - ${conversation.title}\nDate: ${new Date(conversation.createdAt).toLocaleString()}\n\n`;
  for (const msg of conversation.messages) {
    const roleName = msg.role === "user" ? "USER" : "CHAT GPR";
    txt += `[${roleName} - ${new Date(msg.createdAt).toLocaleTimeString()}]:\n${msg.content}\n\n`;
  }
  downloadFile(txt, `${sanitizeFilename(conversation.title)}.txt`, "text/plain");
}

function sanitizeFilename(name: string): string {
  return (name || "chat_gpr_conversation")
    .replace(/[^a-zA-Z0-9_\-\u1780-\u17FF]/g, "_")
    .slice(0, 40);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
