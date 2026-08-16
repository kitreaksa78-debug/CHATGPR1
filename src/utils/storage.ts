import { Conversation, ChatSettings } from "../types.js";

const STORAGE_KEY = "chat_gpr_conversations_v1";
const SETTINGS_KEY = "chat_gpr_settings_v1";
const ACTIVE_CHAT_KEY = "chat_gpr_active_chat_id";

export const DEFAULT_SETTINGS: ChatSettings = {
  webSearchEnabled: false,
  preferredLanguage: "auto",
  temperature: 0.7,
  soundEnabled: true,
  autoTitle: true,
};

export function createNewConversation(isTemporary = false): Conversation {
  return {
    id: "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
    title: isTemporary ? "Temporary Chat" : "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPinned: false,
    isArchived: false,
    isTemporary,
  };
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Conversation[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => !c.isTemporary) : [];
  } catch (e) {
    console.warn("Failed to load conversations from localStorage", e);
    return [];
  }
}

/**
 * Strips heavy binary payloads (like huge raw base64 buffers) from conversation messages
 * to prevent localStorage 5MB quota overflow while preserving chat history, text, and metadata.
 */
function sanitizeConversation(c: Conversation, stripLargeImages = false): Conversation {
  return {
    ...c,
    messages: c.messages.map((m) => {
      const sanitizedAttachments = m.attachments?.map((a) => {
        // Drop bulky raw base64Data which isn't needed for persistent history
        const { base64Data, ...rest } = a;
        if (stripLargeImages && rest.dataUrl && rest.dataUrl.length > 20000) {
          return {
            ...rest,
            dataUrl: undefined,
            previewUrl: rest.previewUrl && rest.previewUrl.length < 20000 ? rest.previewUrl : undefined,
          };
        }
        return rest;
      });

      return {
        ...m,
        attachments: sanitizedAttachments,
      };
    }),
  };
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  
  const toSave = conversations.filter((c) => !c.isTemporary);

  // Attempt 1: Standard save with raw base64 stripped
  try {
    const sanitized = toSave.map((c) => sanitizeConversation(c, false));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return;
  } catch (e1) {
    console.warn("[Storage] Standard save quota reached, attempting light compression...");
  }

  // Attempt 2: Strip large image URLs & keep top 25 conversations
  try {
    const trimmed = toSave.slice(0, 25).map((c) => sanitizeConversation(c, true));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return;
  } catch (e2) {
    console.warn("[Storage] Light compression quota reached, aggressive pruning...");
  }

  // Attempt 3: Keep only the 10 most recent conversations with text-only focus
  try {
    const essential = toSave.slice(0, 10).map((c) => ({
      ...c,
      messages: c.messages.slice(-30).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        intent: m.intent,
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(essential));
  } catch (e3) {
    // Ultimate fallback: do not crash the app
    console.warn("[Storage] localStorage quota completely full; state kept in memory.");
  }
}

export function loadSettings(): ChatSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ChatSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings", e);
  }
}

export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
  } catch (e) {
    // ignore
  }
}

export function calculateStorageUsage(): { usedKb: number; count: number } {
  if (typeof window === "undefined") return { usedKb: 0, count: 0 };
  const raw = localStorage.getItem(STORAGE_KEY) || "";
  const usedBytes = new Blob([raw]).size;
  const count = loadConversations().length;
  return {
    usedKb: Math.round(usedBytes / 1024),
    count,
  };
}
