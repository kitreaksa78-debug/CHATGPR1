/**
 * Telegram AI Agent Service
 * Handles Telegram Bot webhooks and AI-powered auto-replies
 */

import { AgentConfig } from "./agentStorage.js";
import {
  getOrCreateConversation,
  addMessageToConversation,
  isHumanTakeover,
} from "./agentStorage.js";

// ============ Telegram Bot API ============

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: "private" | "group" | "supergroup";
    };
    text?: string;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
    }>;
    document?: {
      file_id: string;
      file_name: string;
      mime_type: string;
    };
  };
}

// ============ Process Incoming Messages ============

export async function processTelegramMessage(
  update: TelegramUpdate,
  agent: AgentConfig,
  aiHandler: (
    message: string,
    history: Array<{ role: string; content: string }>,
    imageBase64?: string
  ) => Promise<string>
): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const userId = message.from.id.toString();
  const userName = message.from.first_name;
  const text = message.text || "";
  const caption = (message as any).caption || "";

  // Handle photos (image understanding)
  if (message.photo && message.photo.length > 0) {
    await handlePhotoMessage(chatId, message, agent, userId, userName, aiHandler);
    return;
  }

  // Handle documents (image files)
  if (message.document && isImageMime(message.document.mime_type)) {
    await handleDocumentMessage(chatId, message, agent, userId, userName, aiHandler);
    return;
  }

  // Handle text messages
  if (!text) return;

  // Handle commands
  if (text.startsWith("/")) {
    await handleTelegramCommand(chatId, text, agent, userId, userName, aiHandler);
    return;
  }

  // Check for human takeover
  if (isHumanTakeover(agent.id)) {
    console.log(`[Telegram] Human takeover active, skipping AI for ${userId}`);
    return;
  }

  // Get or create conversation
  const conv = getOrCreateConversation(agent.id, "telegram", userId, userName);
  addMessageToConversation(conv.id, "user", text);

  // Build history for AI context
  const history = conv.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Send typing indicator
    await sendTelegramTyping(chatId, agent.botToken!);

    // Get AI response
    const aiResponse = await aiHandler(text, history);
    addMessageToConversation(conv.id, "assistant", aiResponse);

    // Send reply
    await sendTelegramMessage(chatId, agent.botToken!, aiResponse);
    console.log(`[Telegram] AI replied to ${userId}`);
  } catch (err) {
    console.error(`[Telegram] AI error for ${userId}:`, err);
    await sendTelegramMessage(
      chatId,
      agent.botToken!,
      "សូមអភ័យទោស ប្រព័ន្ធមានបញ្ហាបណ្ដោះអាសន្ន។ សូមព្យាយាមម្ដងទៀត។"
    );
  }
}

// ============ Photo Message Handler ============

async function handlePhotoMessage(
  chatId: number,
  message: any,
  agent: AgentConfig,
  userId: string,
  userName: string,
  aiHandler: (
    message: string,
    history: Array<{ role: string; content: string }>,
    imageBase64?: string
  ) => Promise<string>
): Promise<void> {
  try {
    await sendTelegramTyping(chatId, agent.botToken!);

    // Get the largest photo
    const photos = message.photo || [];
    const largestPhoto = photos[photos.length - 1];
    if (!largestPhoto?.file_id) {
      await sendTelegramMessage(chatId, agent.botToken!, "មិនអាចទាញរូបភាពបាន។");
      return;
    }

    // Download photo from Telegram
    console.log(`[Telegram] Downloading photo for user ${userId}...`);
    const imageBase64 = await downloadTelegramFile(largestPhoto.file_id, agent.botToken!);
    
    if (!imageBase64) {
      await sendTelegramMessage(chatId, agent.botToken!, "មិនអាចទាញរូបភាពបាន។ សូមព្យាយាមម្ដងទៀត។");
      return;
    }

    // Get caption text or default prompt
    const userMessage = message.caption || "វិភាគរូបភាពនេះ។ ប្រាប់ខ្ញុំពីអ្វីដែលអ្នកឃើញក្នុងរូបភាពនេះ។";

    // Get conversation context
    const conv = getOrCreateConversation(agent.id, "telegram", userId, userName);
    addMessageToConversation(conv.id, "user", `[📷 រូបភាព] ${userMessage}`);

    const history = conv.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    console.log(`[Telegram] Analyzing image with AI for user ${userId}...`);
    
    // Get AI response with image
    const aiResponse = await aiHandler(userMessage, history, imageBase64);
    addMessageToConversation(conv.id, "assistant", aiResponse);

    await sendTelegramMessage(chatId, agent.botToken!, aiResponse);
    console.log(`[Telegram] AI analyzed image for ${userId}`);
  } catch (err) {
    console.error(`[Telegram] Photo analysis error for ${userId}:`, err);
    await sendTelegramMessage(
      chatId,
      agent.botToken!,
      "មិនអាចវិភាគរូបភាពបាន។ សូមព្យាយាមម្ដងទៀត។"
    );
  }
}

// ============ Document Message Handler ============

async function handleDocumentMessage(
  chatId: number,
  message: any,
  agent: AgentConfig,
  userId: string,
  userName: string,
  aiHandler: (
    message: string,
    history: Array<{ role: string; content: string }>,
    imageBase64?: string
  ) => Promise<string>
): Promise<void> {
  // Treat image documents same as photos
  await handlePhotoMessage(chatId, {
    ...message,
    photo: [{ file_id: message.document.file_id }],
    caption: message.caption || "វិភាគរូបភាពនេះ។",
  }, agent, userId, userName, aiHandler);
}

// ============ Handle Commands ============

async function handleTelegramCommand(
  chatId: number,
  command: string,
  agent: AgentConfig,
  userId: string,
  userName: string,
  aiHandler: (
    message: string,
    history: Array<{ role: string; content: string }>,
    imageBase64?: string
  ) => Promise<string>
): Promise<void> {
  const cmd = command.split(" ")[0].toLowerCase();

  switch (cmd) {
    case "/start":
      await sendTelegramMessage(
        chatId,
        agent.botToken!,
        agent.welcomeMessage || `👋 Welcome ${userName}! I'm an AI assistant. How can I help you today?\n\nCommands:\n/ai <message> - Ask AI anything\n/help - Show help\n/stop - Disable AI replies`
      );
      break;

    case "/help":
      await sendTelegramMessage(
        chatId,
        agent.botToken!,
        `🤖 AI Assistant Commands:\n\n/ai <message> - Ask AI anything\n/help - Show this help\n/stop - Disable AI replies\n/start - Enable AI replies\n\nOr just send me a message!`
      );
      break;

    case "/stop":
      await sendTelegramMessage(
        chatId,
        agent.botToken!,
        "🤖 AI Agent disabled. A human will respond shortly.\n\nType /start to re-enable AI."
      );
      break;

    case "/ai":
      const aiMessage = command.slice(3).trim();
      if (!aiMessage) {
        await sendTelegramMessage(chatId, agent.botToken!, "Please provide a message after /ai");
        return;
      }

      const conv = getOrCreateConversation(agent.id, "telegram", userId, userName);
      addMessageToConversation(conv.id, "user", aiMessage);

      const history = conv.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        await sendTelegramTyping(chatId, agent.botToken!);
        const aiResponse = await aiHandler(aiMessage, history);
        addMessageToConversation(conv.id, "assistant", aiResponse);
        await sendTelegramMessage(chatId, agent.botToken!, aiResponse);
      } catch (err) {
        await sendTelegramMessage(chatId, agent.botToken!, "Error processing your request.");
      }
      break;

    default:
      await sendTelegramMessage(chatId, agent.botToken!, "Unknown command. Type /help for available commands.");
  }
}

// ============ Send Messages ============

export async function sendTelegramMessage(
  chatId: number,
  botToken: string,
  text: string
): Promise<boolean> {
  try {
    // Split long messages (Telegram limit is 4096 chars)
    const chunks = splitMessage(text, 4000);

    for (const chunk of chunks) {
      const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: "Markdown",
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        // Retry without markdown if parsing fails
        await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
          }),
        });
      }
    }
    return true;
  } catch (err) {
    console.error("[Telegram] Send failed:", err);
    return false;
  }
}

export async function sendTelegramTyping(chatId: number, botToken: string): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });
  } catch (err) {
    // Ignore typing errors
  }
}

// ============ Bot Info ============

export async function getTelegramBotInfo(
  botToken: string
): Promise<{ id: number; username: string; first_name: string } | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram] Get bot info error:", data.description);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error("[Telegram] Get bot info failed:", err);
    return null;
  }
}

// ============ Setup Webhook ============

export async function setupTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message"],
      }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("[Telegram] Setup webhook error:", data.description);
      return false;
    }
    console.log("[Telegram] Webhook setup successful");
    return true;
  } catch (err) {
    console.error("[Telegram] Setup webhook failed:", err);
    return false;
  }
}

// ============ Helpers ============

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      // Try space
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

// ============ Image Helpers ============

function isImageMime(mimeType?: string): boolean {
  if (!mimeType) return false;
  return [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "image/bmp", "image/tiff",
  ].includes(mimeType.toLowerCase());
}

async function downloadTelegramFile(
  fileId: string,
  botToken: string
): Promise<string | null> {
  try {
    // Step 1: Get file path from Telegram
    const fileInfoRes = await fetch(
      `${TELEGRAM_API}/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      console.error("[Telegram] getFile failed:", fileInfo.description);
      return null;
    }

    const filePath = fileInfo.result.file_path;
    const fileSize = fileInfo.result.file_size || 0;

    // Telegram has a 20MB limit for bot downloads
    if (fileSize > 20 * 1024 * 1024) {
      console.error("[Telegram] File too large:", fileSize);
      return null;
    }

    // Step 2: Download the file
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      console.error("[Telegram] File download failed:", fileRes.status);
      return null;
    }

    // Step 3: Convert to base64
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    console.log(`[Telegram] Downloaded file: ${filePath} (${(fileSize / 1024).toFixed(1)}KB)`);
    return base64;
  } catch (err) {
    console.error("[Telegram] downloadTelegramFile error:", err);
    return null;
  }
}
