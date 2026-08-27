/**
 * Agent Storage Service
 * Manages Facebook and Telegram AI Agent configurations
 * Uses JSON file-based storage (server-side only)
 */

import fs from "fs";
import path from "path";

export interface AgentConfig {
  id: string;
  platform: "facebook" | "telegram";
  enabled: boolean;
  humanTakeover: boolean;
  // Facebook specific
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  // Telegram specific
  botToken?: string;
  botUsername?: string;
  // Common
  webhookUrl?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
  commentReplyPrompt?: string;
  autoPostPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  platform: "facebook" | "telegram";
  userId: string;
  userName?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

const AGENTS_FILE = path.join(process.cwd(), "data", "agents.json");
const CONVERSATIONS_FILE = path.join(process.cwd(), "data", "conversations.json");

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load agents from file
function loadAgents(): AgentConfig[] {
  ensureDataDir();
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const data = fs.readFileSync(AGENTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[AgentStorage] Failed to load agents:", err);
  }
  return [];
}

// Save agents to file
function saveAgents(agents: AgentConfig[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
  } catch (err) {
    console.error("[AgentStorage] Failed to save agents:", err);
  }
}

// Load conversations from file
function loadConversations(): AgentConversation[] {
  ensureDataDir();
  try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      const data = fs.readFileSync(CONVERSATIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[AgentStorage] Failed to load conversations:", err);
  }
  return [];
}

// Save conversations to file
function saveConversations(conversations: AgentConversation[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
  } catch (err) {
    console.error("[AgentStorage] Failed to save conversations:", err);
  }
}

// ============ Agent CRUD ============

export function getAllAgents(): AgentConfig[] {
  return loadAgents();
}

export function getAgentById(id: string): AgentConfig | undefined {
  return loadAgents().find((a) => a.id === id);
}

export function getAgentByPlatform(platform: "facebook" | "telegram"): AgentConfig | undefined {
  return loadAgents().find((a) => a.platform === platform);
}

export function getAgentsByPlatform(platform: "facebook" | "telegram"): AgentConfig[] {
  return loadAgents().filter((a) => a.platform === platform);
}

export function createAgent(config: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">): AgentConfig {
  const agents = loadAgents();
  const newAgent: AgentConfig = {
    ...config,
    id: `agent_${config.platform}_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  agents.push(newAgent);
  saveAgents(agents);
  console.log(`[AgentStorage] Created ${config.platform} agent: ${newAgent.id}`);
  return newAgent;
}

export function updateAgent(id: string, updates: Partial<AgentConfig>): AgentConfig | null {
  const agents = loadAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return null;

  agents[index] = {
    ...agents[index],
    ...updates,
    id: agents[index].id, // Prevent ID change
    platform: agents[index].platform, // Prevent platform change
    updatedAt: Date.now(),
  };
  saveAgents(agents);
  console.log(`[AgentStorage] Updated agent: ${id}`);
  return agents[index];
}

export function deleteAgent(id: string): boolean {
  const agents = loadAgents();
  const filtered = agents.filter((a) => a.id !== id);
  if (filtered.length === agents.length) return false;
  saveAgents(filtered);
  console.log(`[AgentStorage] Deleted agent: ${id}`);
  return true;
}

export function toggleAgent(id: string): AgentConfig | null {
  const agents = loadAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) return null;
  agent.enabled = !agent.enabled;
  agent.updatedAt = Date.now();
  saveAgents(agents);
  console.log(`[AgentStorage] Toggled agent ${id}: enabled=${agent.enabled}`);
  return agent;
}

export function toggleHumanTakeover(id: string): AgentConfig | null {
  const agents = loadAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) return null;
  agent.humanTakeover = !agent.humanTakeover;
  agent.updatedAt = Date.now();
  saveAgents(agents);
  console.log(`[AgentStorage] Toggled human takeover for ${id}: ${agent.humanTakeover}`);
  return agent;
}

// ============ Conversation Management ============

export function getAgentConversations(agentId: string, limit = 50): AgentConversation[] {
  return loadConversations()
    .filter((c) => c.agentId === agentId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function getConversationById(conversationId: string): AgentConversation | undefined {
  return loadConversations().find((c) => c.id === conversationId);
}

export function getOrCreateConversation(
  agentId: string,
  platform: "facebook" | "telegram",
  userId: string,
  userName?: string
): AgentConversation {
  const conversations = loadConversations();
  let conv = conversations.find(
    (c) => c.agentId === agentId && c.userId === userId
  );

  if (!conv) {
    conv = {
      id: `conv_${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      platform,
      userId,
      userName,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    conversations.push(conv);
    saveConversations(conversations);
    console.log(`[AgentStorage] Created conversation: ${conv.id}`);
  }

  return conv;
}

export function addMessageToConversation(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): void {
  const conversations = loadConversations();
  const conv = conversations.find((c) => c.id === conversationId);
  if (!conv) return;

  conv.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  conv.updatedAt = Date.now();

  // Keep only last 50 messages per conversation
  if (conv.messages.length > 50) {
    conv.messages = conv.messages.slice(-50);
  }

  saveConversations(conversations);
}

// ============ Helper Functions ============

export function getFacebookAgent(): AgentConfig | undefined {
  return loadAgents().find((a) => a.platform === "facebook" && a.enabled);
}

export function getTelegramAgent(): AgentConfig | undefined {
  return loadAgents().find((a) => a.platform === "telegram" && a.enabled);
}

export function isAgentEnabled(platform: "facebook" | "telegram"): boolean {
  const agent = loadAgents().find((a) => a.platform === platform);
  return agent?.enabled ?? false;
}

export function isHumanTakeover(agentId: string): boolean {
  const agent = loadAgents().find((a) => a.id === agentId);
  return agent?.humanTakeover ?? false;
}
