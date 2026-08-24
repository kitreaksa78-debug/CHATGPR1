/**
 * Agent Dashboard
 * Manages Facebook and Telegram AI Agents
 */

import { useState, useEffect } from "react";

interface Agent {
  id: string;
  platform: "facebook" | "telegram";
  enabled: boolean;
  humanTakeover: boolean;
  pageId?: string;
  pageName?: string;
  botUsername?: string;
  webhookUrl?: string;
  welcomeMessage?: string;
  createdAt: number;
  updatedAt: number;
}

interface AgentConversation {
  id: string;
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

interface AgentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentDashboard({ isOpen, onClose }: AgentDashboardProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "setup" | "conversations">("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup form state
  const [setupPlatform, setSetupPlatform] = useState<"facebook" | "telegram">("facebook");
  const [facebookToken, setFacebookToken] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("👋 Welcome! How can I help you?");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError("Failed to load agents");
    }
  };

  const fetchConversations = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError("Failed to load conversations");
    }
  };

  const handleVerifyToken = async () => {
    setVerifying(true);
    setError("");
    setVerifiedInfo(null);

    try {
      if (setupPlatform === "facebook") {
        const res = await fetch("/api/agents/facebook/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageAccessToken: facebookToken }),
        });
        const data = await res.json();
        if (data.valid) {
          setVerifiedInfo(data.page);
        } else {
          setError(data.error || "Invalid token");
        }
      } else {
        const res = await fetch("/api/agents/telegram/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botToken: telegramToken }),
        });
        const data = await res.json();
        if (data.valid) {
          setVerifiedInfo(data.bot);
        } else {
          setError(data.error || "Invalid token");
        }
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateAgent = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: setupPlatform,
          pageAccessToken: setupPlatform === "facebook" ? facebookToken : undefined,
          botToken: setupPlatform === "telegram" ? telegramToken : undefined,
          welcomeMessage: welcomeMsg,
          systemPrompt,
        }),
      });

      if (res.ok) {
        await fetchAgents();
        setActiveTab("list");
        setFacebookToken("");
        setTelegramToken("");
        setVerifiedInfo(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create agent");
      }
    } catch (err) {
      setError("Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/toggle`, { method: "POST" });
      await fetchAgents();
    } catch (err) {
      setError("Failed to toggle agent");
    }
  };

  const handleToggleHumanTakeover = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/human-takeover`, { method: "POST" });
      await fetchAgents();
    } catch (err) {
      setError("Failed to toggle human takeover");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      await fetchAgents();
      setSelectedAgent(null);
    } catch (err) {
      setError("Failed to delete agent");
    }
  };

  const handleSetupWebhook = async (agentId: string, platform: string) => {
    try {
      const res = await fetch(`/api/agents/${platform}/setup`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`Webhook setup successful!\nURL: ${data.webhookUrl}`);
        await fetchAgents();
      } else {
        setError(data.error || "Webhook setup failed");
      }
    } catch (err) {
      setError("Webhook setup failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#111318] border border-[#242933] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E232E] bg-[#171A21]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-bold text-white">AI Agents</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933]">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1E232E] bg-[#171A21]">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 text-sm font-medium ${activeTab === "list" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
          >
            Agents
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`px-6 py-3 text-sm font-medium ${activeTab === "setup" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
          >
            + Add Agent
          </button>
          {selectedAgent && (
            <button
              onClick={() => {
                setActiveTab("conversations");
                fetchConversations(selectedAgent.id);
              }}
              className={`px-6 py-3 text-sm font-medium ${activeTab === "conversations" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
            >
              Conversations
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-300 ml-2">✕</button>
            </div>
          )}

          {/* Agent List */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {agents.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8]">
                  <span className="text-4xl">🤖</span>
                  <p className="mt-4">No agents configured yet</p>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="mt-4 px-4 py-2 bg-[#6366F1] text-white rounded-xl text-sm hover:opacity-90"
                  >
                    + Add Agent
                  </button>
                </div>
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-4 bg-[#171A21] border border-[#242933] rounded-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.platform === "facebook" ? "📘" : "✈️"}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white">
                            {agent.platform === "facebook" ? "Facebook" : "Telegram"} Agent
                          </h3>
                          <p className="text-xs text-[#94A3B8] truncate">
                            {agent.pageName || agent.botUsername || "Not connected"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleToggleAgent(agent.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            agent.enabled
                              ? "bg-green-500/20 text-green-400"
                              : "bg-[#242933] text-[#94A3B8]"
                          }`}
                        >
                          {agent.enabled ? "Enabled" : "Disabled"}
                        </button>

                        <button
                          onClick={() => handleToggleHumanTakeover(agent.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            agent.humanTakeover
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-[#242933] text-[#94A3B8]"
                          }`}
                        >
                          {agent.humanTakeover ? "👤 Human" : "🤖 AI"}
                        </button>

                        <button
                          onClick={() => handleSetupWebhook(agent.id, agent.platform)}
                          className="px-3 py-1.5 bg-[#6366F1]/20 text-[#818CF8] rounded-lg text-xs"
                        >
                          Webhook
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAgent(agent);
                            setActiveTab("conversations");
                            fetchConversations(agent.id);
                          }}
                          className="px-3 py-1.5 bg-[#242933] text-[#94A3B8] rounded-lg text-xs"
                        >
                          Logs
                        </button>

                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {agent.webhookUrl && (
                      <div className="mt-3 p-2 bg-[#0B0D10] rounded-lg">
                        <p className="text-[10px] text-[#64748B]">Webhook URL:</p>
                        <p className="text-xs text-[#94A3B8] font-mono truncate">{agent.webhookUrl}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Setup Form */}
          {activeTab === "setup" && (
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Platform</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSetupPlatform("facebook")}
                    className={`flex-1 p-3 rounded-xl border ${
                      setupPlatform === "facebook"
                        ? "border-[#6366F1] bg-[#6366F1]/10"
                        : "border-[#242933] bg-[#171A21]"
                    }`}
                  >
                    📘 Facebook
                  </button>
                  <button
                    onClick={() => setSetupPlatform("telegram")}
                    className={`flex-1 p-3 rounded-xl border ${
                      setupPlatform === "telegram"
                        ? "border-[#6366F1] bg-[#6366F1]/10"
                        : "border-[#242933] bg-[#171A21]"
                    }`}
                  >
                    ✈️ Telegram
                  </button>
                </div>
              </div>

              {setupPlatform === "facebook" ? (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Facebook Page Access Token
                  </label>
                  <input
                    type="password"
                    value={facebookToken}
                    onChange={(e) => setFacebookToken(e.target.value)}
                    placeholder="Enter your Facebook Page Access Token"
                    className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="Enter your Telegram Bot Token"
                    className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              )}

              <button
                onClick={handleVerifyToken}
                disabled={verifying || (!facebookToken && !telegramToken)}
                className="w-full py-2 bg-[#242933] text-white rounded-xl text-sm hover:bg-[#2E3340] disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify Token"}
              </button>

              {verifiedInfo && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm font-medium">✓ Token Verified</p>
                  <p className="text-white text-sm mt-1">
                    {setupPlatform === "facebook"
                      ? `Page: ${verifiedInfo.name}`
                      : `Bot: @${verifiedInfo.username}`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Welcome Message
                </label>
                <input
                  type="text"
                  value={welcomeMsg}
                  onChange={(e) => setWelcomeMsg(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  placeholder="Custom instructions for the AI agent..."
                  className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>

              <button
                onClick={handleCreateAgent}
                disabled={loading || (!facebookToken && !telegramToken)}
                className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Agent"}
              </button>
            </div>
          )}

          {/* Conversations */}
          {activeTab === "conversations" && selectedAgent && (
            <div className="space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8]">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 bg-[#171A21] border border-[#242933] rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-white">
                          {conv.userName || conv.userId}
                        </span>
                        <span className="text-xs text-[#94A3B8] ml-2">
                          {conv.messages.length} messages
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {new Date(conv.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {conv.messages.slice(-5).map((msg, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-lg text-xs ${
                            msg.role === "user"
                              ? "bg-[#6366F1]/10 text-[#818CF8]"
                              : "bg-[#242933] text-[#CBD5E1]"
                          }`}
                        >
                          <span className="font-medium">
                            {msg.role === "user" ? "User" : "AI"}:
                          </span>{" "}
                          {msg.content.slice(0, 100)}...
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
