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
    console.error("Failed to load conversations from localStorage", e);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    // Only persist non-temporary chats
    const toSave = conversations.filter((c) => !c.isTemporary);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Failed to save conversations to localStorage", e);
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
    console.error("Failed to save settings", e);
  }
}

export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHAT_KEY, id);
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
