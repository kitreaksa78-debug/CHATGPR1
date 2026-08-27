/**
 * Facebook AI Agent Service
 * Handles Facebook Messenger webhooks and AI-powered auto-replies
 */

import { AgentConfig } from "./agentStorage.js";
import {
  getFacebookAgent,
  getOrCreateConversation,
  addMessageToConversation,
  isHumanTakeover,
} from "./agentStorage.js";

// ============ Webhook Verification ============

export function verifyFacebookWebhook(
  mode: string,
  token: string,
  challenge: string,
  verifyToken: string
): string | null {
  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Facebook] Webhook verified successfully");
    return challenge;
  }
  console.warn("[Facebook] Webhook verification failed");
  return null;
}

// ============ Signature Verification ============

export function verifyFacebookSignature(
  body: string,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature || !appSecret) return false;

  const crypto = require("crypto");
  const expectedSig = signature.replace("sha256=", "");
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(body);
  const digest = hmac.digest("hex");

  return expectedSig === digest;
}

// ============ Process Incoming Messages ============

export interface FacebookMessage {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: { url?: string };
    }>;
  };
  postback?: {
    title: string;
    payload: string;
  };
}

export interface FacebookWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: FacebookMessage[];
  }>;
}

export async function processFacebookMessage(
  event: FacebookWebhookEvent,
  agent: AgentConfig,
  aiHandler: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>
): Promise<void> {
  if (event.object !== "page") {
    console.warn("[Facebook] Received non-page event");
    return;
  }

  for (const entry of event.entry) {
    for (const messaging of entry.messaging) {
      const senderId = messaging.sender?.id;
      if (!senderId) continue;

      // Handle messages
      if (messaging.message?.text) {
        const userMessage = messaging.message.text;

        // Check for commands
        if (userMessage.toLowerCase() === "/stop") {
          await sendFacebookMessage(senderId, agent.pageAccessToken!, "🤖 AI Agent disabled. A human will respond shortly.");
          continue;
        }

        if (userMessage.toLowerCase() === "/start") {
          await sendFacebookMessage(
            senderId,
            agent.pageAccessToken!,
            agent.welcomeMessage || "👋 Welcome! I'm an AI assistant. How can I help you today?"
          );
          continue;
        }

        // Check for human takeover
        if (isHumanTakeover(agent.id)) {
          console.log(`[Facebook] Human takeover active, skipping AI for ${senderId}`);
          continue;
        }

        // Get or create conversation
        const conv = getOrCreateConversation(agent.id, "facebook", senderId);
        addMessageToConversation(conv.id, "user", userMessage);

        // Build history for AI context
        const history = conv.messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          // Get AI response
          const aiResponse = await aiHandler(userMessage, history);
          addMessageToConversation(conv.id, "assistant", aiResponse);

          // Send reply
          await sendFacebookMessage(senderId, agent.pageAccessToken!, aiResponse);
          console.log(`[Facebook] AI replied to ${senderId}`);
        } catch (err) {
          console.error(`[Facebook] AI error for ${senderId}:`, err);
          await sendFacebookMessage(
            senderId,
            agent.pageAccessToken!,
            "Sorry, I'm experiencing technical difficulties. Please try again later."
          );
        }
      }

      // Handle postbacks
      if (messaging.postback) {
        const payload = messaging.postback.payload;
        if (payload === "GET_STARTED") {
          await sendFacebookMessage(
            senderId,
            agent.pageAccessToken!,
            agent.welcomeMessage || "👋 Welcome! How can I help you?"
          );
        }
      }
    }
  }
}

// ============ Send Messages ============

export async function sendFacebookMessage(
  recipientId: string,
  pageAccessToken: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text.slice(0, 2000) }, // Facebook limit
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error("[Facebook] Send error:", data.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Facebook] Send failed:", err);
    return false;
  }
}

// ============ Get Page Info ============

export async function getFacebookPageInfo(
  pageAccessToken: string
): Promise<{ id: string; name: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${pageAccessToken}&fields=id,name`
    );
    const data = await response.json();
    if (data.error) {
      console.error("[Facebook] Get page info error:", data.error);
      return null;
    }
    return { id: data.id, name: data.name };
  } catch (err) {
    console.error("[Facebook] Get page info failed:", err);
    return null;
  }
}

// ============ Setup Webhook ============

export async function setupFacebookWebhook(
  pageAccessToken: string,
  callbackUrl: string,
  verifyToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/subscribed_apps?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: "messages,messaging_postbacks,feed",
        }),
      }
    );
    const data = await response.json();
    if (data.error) {
      console.error("[Facebook] Setup webhook error:", data.error);
      return false;
    }
    console.log("[Facebook] Webhook setup successful");
    return true;
  } catch (err) {
    console.error("[Facebook] Setup webhook failed:", err);
    return false;
  }
}

// ============ Auto-Post to Facebook Page ============

export interface FacebookPostOptions {
  pageAccessToken: string;
  message: string;
  link?: string;
  imageUrl?: string;
}

export interface FacebookPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Create a post on Facebook Page
 */
export async function createFacebookPost(
  options: FacebookPostOptions
): Promise<FacebookPostResult> {
  const { pageAccessToken, message, link, imageUrl } = options;

  try {
    let endpoint = `https://graph.facebook.com/v19.0/me/feed`;
    let body: any = { message };

    if (imageUrl) {
      // Post with photo
      endpoint = `https://graph.facebook.com/v19.0/me/photos`;
      body = { url: imageUrl, caption: message };
    } else if (link) {
      // Post with link
      body.link = link;
    }

    const response = await fetch(`${endpoint}?access_token=${pageAccessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[Facebook] Post error:", data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`[Facebook] Post created: ${data.id}`);
    return { success: true, postId: data.id };
  } catch (err: any) {
    console.error("[Facebook] Post failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ============ Auto-Reply to Comments ============

export interface FacebookCommentEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      value: {
        item: string;
        post_id: string;
        verb: string;
        sender_name: string;
        sender_id: string;
        message?: string;
        comment_id?: string;
        parent_id?: string;
      };
      field: string;
    }>;
  }>;
}

/**
 * Process Facebook comment webhook
 */
export async function processFacebookComment(
  event: FacebookCommentEvent,
  agent: AgentConfig,
  aiHandler: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>
): Promise<void> {
  if (event.object !== "page") return;

  for (const entry of event.entry) {
    for (const change of entry.changes) {
      if (change.field !== "feed") continue;
      
      const { value } = change;
      
      // Only handle new comments
      if (value.verb !== "add" || !value.message || !value.comment_id) continue;
      
      // Don't reply to our own comments
      if (value.sender_id === entry.id) continue;
      
      // Check for human takeover
      if (isHumanTakeover(agent.id)) {
        console.log("[Facebook] Human takeover active, skipping comment reply");
        continue;
      }

      console.log(`[Facebook] New comment from ${value.sender_name}: ${value.message}`);

      try {
        // Get AI response for the comment
        const aiResponse = await aiHandler(
          value.message,
          [{ role: "user", content: value.message }]
        );

        // Reply to the comment
        await replyToFacebookComment(
          value.comment_id,
          agent.pageAccessToken!,
          aiResponse
        );

        console.log(`[Facebook] AI replied to comment ${value.comment_id}`);
      } catch (err) {
        console.error("[Facebook] Comment reply error:", err);
      }
    }
  }
}

/**
 * Reply to a Facebook comment
 */
export async function replyToFacebookComment(
  commentId: string,
  pageAccessToken: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${commentId}/comments?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.slice(0, 1000) }),
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error("[Facebook] Comment reply error:", data.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Facebook] Comment reply failed:", err);
    return false;
  }
}

// ============ Auto-Reply to Page Messages ============

/**
 * Process incoming page messages (inbox)
 */
export async function processPageMessage(
  senderId: string,
  message: string,
  agent: AgentConfig,
  aiHandler: (message: string, history: Array<{ role: string; content: string }>) => Promise<string>
): Promise<void> {
  // Check for human takeover
  if (isHumanTakeover(agent.id)) {
    console.log(`[Facebook] Human takeover active, skipping message for ${senderId}`);
    return;
  }

  // Get or create conversation
  const conv = getOrCreateConversation(agent.id, "facebook", senderId);
  addMessageToConversation(conv.id, "user", message);

  // Build history for AI context
  const history = conv.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Get AI response
    const aiResponse = await aiHandler(message, history);
    addMessageToConversation(conv.id, "assistant", aiResponse);

    // Send reply
    await sendFacebookMessage(senderId, agent.pageAccessToken!, aiResponse);
    console.log(`[Facebook] AI replied to message from ${senderId}`);
  } catch (err) {
    console.error(`[Facebook] Message reply error for ${senderId}:`, err);
  }
}
