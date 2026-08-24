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
  aiHandler: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>
): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const userId = message.from.id.toString();
  const userName = message.from.first_name;
  const text = message.text;

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
      "Sorry, I'm experiencing technical difficulties. Please try again later."
    );
  }
}

// ============ Handle Commands ============

async function handleTelegramCommand(
  chatId: number,
  command: string,
  agent: AgentConfig,
  userId: string,
  userName: string,
  aiHandler: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>
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
