/**
 * Agent Dashboard
 * Manages Facebook and Telegram AI Agents
 */

import { useState, useEffect, useRef } from "react";

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
  systemPrompt?: string;
  commentReplyPrompt?: string;
  autoPostPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

interface AgentConversation {
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
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [selectedConv, setSelectedConv] = useState<AgentConversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Setup form state
  const [setupPlatform, setSetupPlatform] = useState<"facebook" | "telegram">("facebook");
  const [facebookToken, setFacebookToken] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("👋 Welcome! How can I help you?");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [commentReplyPrompt, setCommentReplyPrompt] = useState("");
  const [autoPostPrompt, setAutoPostPrompt] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState<any>(null);

  // Edit agent state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editWelcomeMsg, setEditWelcomeMsg] = useState("");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editBotToken, setEditBotToken] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages]);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError("បង្ហាញ Agent បានបរាជ័យ។");
    }
  };

  const fetchConversations = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError("បង្ហាញសារបានបរាជ័យ។");
    }
  };

  const handleReply = async (conv: AgentConversation) => {
    if (!replyText.trim() || !selectedAgent) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: conv.userId,
          message: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        // Add the reply to the local conversation immediately
        setSelectedConv((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                role: "assistant" as const,
                content: replyText.trim(),
                timestamp: Date.now(),
              },
            ],
          };
        });
        // Also update in conversations list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      role: "assistant" as const,
                      content: replyText.trim(),
                      timestamp: Date.now(),
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } else {
        setError(data.error || "ឆ្លើយតបបានបរាជ័យ។");
      }
    } catch (err) {
      setError("ឆ្លើយតបបានបរាជ័យ។ សូមពិនិត្យ Internet។");
    } finally {
      setReplying(false);
    }
  };

  const handleVerifyToken = async () => {
    setVerifying(true);
    setError("");
    setVerifiedInfo(null);

    const token = setupPlatform === "facebook" ? facebookToken : telegramToken;

    // Client-side token format validation
    if (setupPlatform === "telegram" && token && !token.includes(":")) {
      setError("Telegram Token មិនត្រឹមត្រូវ។ Token ត្រូវតែមានរូបភាព៖ លេខ:អក្សរ (ឧ. 123456789:ABCdefGHI)");
      setVerifying(false);
      return;
    }
    if (setupPlatform === "facebook" && token && !token.startsWith("EAA") && !token.startsWith("EAAG")) {
      setError("Facebook Token មិនត្រឹមត្រូវ។ Token ត្រូវតែចាប់ផ្តើមដោយ EAA ឬ EAAG (Page Access Token)");
      setVerifying(false);
      return;
    }

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
          setError(data.error || "Token មិនត្រឹមត្រូវ។ សូមពិនិត្យមើល Page Access Token របស់អ្នក។");
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
          setError(data.error || "Token មិនត្រឹមត្រូវ។ សូមពិនិត្យមើល Bot Token របស់អ្នក។");
        }
      }
    } catch (err) {
      setError("ការពិនិត្យបានបរាជ័យ។ សូមពិនិត្យមើល Internet របស់អ្នក។");
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
          commentReplyPrompt: setupPlatform === "facebook" ? commentReplyPrompt : undefined,
          autoPostPrompt: setupPlatform === "facebook" ? autoPostPrompt : undefined,
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
        setError(data.error || "បង្កើត Agent បានបរាជ័យ។ សូមពិនិត្យ Token របស់អ្នក។");
      }
    } catch (err) {
      setError("បង្កើត Agent បានបរាជ័យ។ សូមពិនិត្យ Internet របស់អ្នក។");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/toggle`, { method: "POST" });
      await fetchAgents();
    } catch (err) {
      setError("ប្តូរស្ថានភាព Agent បានបរាជ័យ។");
    }
  };

  const handleToggleHumanTakeover = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/human-takeover`, { method: "POST" });
      await fetchAgents();
    } catch (err) {
      setError("ប្តូរ Human Takeover បានបរាជ័យ។");
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("តើអ្នកពិតជាចង់លុប Agent នេះមែនទេ?")) return;
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      await fetchAgents();
      setSelectedAgent(null);
    } catch (err) {
      setError("លុប Agent បានបរាជ័យ។");
    }
  };

  const handleSetupWebhook = async (agentId: string, platform: string) => {
    try {
      const res = await fetch(`/api/agents/${platform}/setup`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`Webhook បានដំឡើងជោគជ័យ!\nURL: ${data.webhookUrl}`);
        await fetchAgents();
      } else {
        setError(data.error || "Webhook បានបរាជ័យ។ សូមពិនិត្យ Token របស់អ្នក។");
      }
    } catch (err) {
      setError("Webhook បានបរាជ័យ។");
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString("km-KH", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPlatformBadge = (platform: string) => {
    if (platform === "telegram") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">
          ✈️ Telegram
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-600/20 text-blue-300">
        📘 Facebook
      </span>
    );
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
            onClick={() => { setActiveTab("list"); setSelectedConv(null); setEditingAgent(null); }}
            className={`px-6 py-3 text-sm font-medium ${activeTab === "list" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
          >
            🤖 Agents
          </button>
          <button
            onClick={() => { setActiveTab("setup"); setSelectedConv(null); setEditingAgent(null); }}
            className={`px-6 py-3 text-sm font-medium ${activeTab === "setup" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
          >
            + បន្ថែម
          </button>
          {selectedAgent && (
            <button
              onClick={() => {
                setActiveTab("conversations");
                setSelectedConv(null);
                setEditingAgent(null);
                fetchConversations(selectedAgent.id);
              }}
              className={`px-6 py-3 text-sm font-medium ${activeTab === "conversations" ? "text-[#818CF8] border-b-2 border-[#818CF8]" : "text-[#94A3B8] hover:text-white"}`}
            >
              💬 សារ
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
          {activeTab === "list" && !selectedConv && !editingAgent && (
            <div className="space-y-4">
              {agents.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8]">
                  <span className="text-4xl">🤖</span>
                  <p className="mt-4">មិនទាន់មាន Agent ណាមួយនៅឡើយ</p>
                  <p className="text-xs text-[#64748B] mt-2">បន្ថែម Telegram Bot ឬ Facebook Agent ដើម្បីចាប់ផ្តើម</p>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="mt-4 px-4 py-2 bg-[#6366F1] text-white rounded-xl text-sm hover:opacity-90"
                  >
                    + បន្ថែម Agent
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
                            {agent.webhookUrl ? "✅ Connected" : "⚠️ Setup needed"}
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
                          🔗 Webhook
                        </button>

                        <button
                          onClick={() => {
                            setSelectedAgent(agent);
                            setActiveTab("conversations");
                            setSelectedConv(null);
                            fetchConversations(agent.id);
                          }}
                          className="px-3 py-1.5 bg-[#242933] text-[#94A3B8] rounded-lg text-xs"
                        >
                          💬 សារ
                        </button>

                        <button
                          onClick={() => {
                            setEditingAgent(agent);
                            setEditWelcomeMsg(agent.welcomeMessage || "");
                            setEditSystemPrompt(agent.systemPrompt || "");
                            setEditBotToken("");
                          }}
                          className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs"
                        >
                          ✏️ កែ
                        </button>

                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs"
                        >
                          លុប
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
          {/* Edit Agent Modal */}
          {editingAgent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingAgent(null)}
                  className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] text-sm"
                >
                  ← ថយក្រោយ
                </button>
                <h3 className="text-base font-bold text-white">✏️ កែ Agent Settings</h3>
                {getPlatformBadge(editingAgent.platform)}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">💬 សារស្វាគមន៍</label>
                  <input
                    type="text"
                    value={editWelcomeMsg}
                    onChange={(e) => setEditWelcomeMsg(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D10] border border-[#242933] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">🧠 System Prompt</label>
                  <textarea
                    value={editSystemPrompt}
                    onChange={(e) => setEditSystemPrompt(e.target.value)}
                    rows={4}
                    placeholder="ឧ. អ្នកជា AI ជំនួយការសម្រាប់ហាងទូរសព្ទ..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D10] border border-[#242933] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] resize-none"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">ទុកទទេបើមិនចង់កែប្រែ</p>
                </div>

                {editingAgent.platform === "telegram" && (
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">🔑 Bot Token ថ្មី</label>
                    <input
                      type="password"
                      value={editBotToken}
                      onChange={(e) => setEditBotToken(e.target.value)}
                      placeholder="ទុកទទេបើមិនចង់ប្ដូរ"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D10] border border-[#242933] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                    />
                  </div>
                )}

                {editingAgent.platform === "facebook" && (
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">🔑 Page Access Token ថ្មី</label>
                    <input
                      type="password"
                      value={editBotToken}
                      onChange={(e) => setEditBotToken(e.target.value)}
                      placeholder="ទុកទទេបើមិនចង់ប្ដូរ"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D10] border border-[#242933] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono"
                    />
                  </div>
                )}

                <button
                  onClick={async () => {
                    setEditSaving(true);
                    try {
                      const body: any = {};
                      if (editWelcomeMsg) body.welcomeMessage = editWelcomeMsg;
                      if (editSystemPrompt) body.systemPrompt = editSystemPrompt;
                      if (editBotToken) {
                        if (editingAgent.platform === "telegram") body.botToken = editBotToken;
                        else body.pageAccessToken = editBotToken;
                      }
                      const res = await fetch(`/api/agents/${editingAgent.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                      });
                      if (res.ok) {
                        setEditingAgent(null);
                        await fetchAgents();
                        setError("");
                      } else {
                        const data = await res.json();
                        setError(data.error || "កែប្រែបានបរាជ័យ។");
                      }
                    } catch (err) {
                      setError("កែប្រែបានបរាជ័យ។ សូមពិនិត្យ Internet។");
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  disabled={editSaving}
                  className="w-full py-2.5 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {editSaving ? "កំពុងរក្សាទុក..." : "💾 រក្សាទុកការកែប្រែ"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "setup" && !editingAgent && (
            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  ជ្រើសរើស Platform
                </label>
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

              {/* Setup Instructions */}
              {setupPlatform === "telegram" ? (
                <div className="p-3 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl text-xs text-[#94A3B8] space-y-2">
                  <p className="text-[#818CF8] font-medium">📋 របៀបបង្កើត Telegram Bot៖</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>បើក Telegram ហើយស្វែងរក <span className="text-white font-medium">@BotFather</span></li>
                    <li>ផ្ញើពាក្យបញ្ជា <span className="text-white font-medium">/newbot</span></li>
                    <li>ដាក់ឈ្មោះ Bot របស់អ្នក</li>
                    <li>ដាក់ username របស់ Bot (ចប់ដោយ <span className="text-white font-medium">bot</span>)</li>
                    <li>BotFather នឹងផ្ញើ <span className="text-white font-medium">Bot Token</span> មកអ្នក</li>
                    <li>ចម្លង Token មកដាក់ក្នុងប្រអប់ខាងក្រោម</li>
                  </ol>
                  <p className="text-yellow-400">⚠️ រូបភាព និង Files អាចផ្ញើបាន!</p>
                </div>
              ) : (
                <div className="p-3 bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl text-xs text-[#94A3B8] space-y-2">
                  <p className="text-[#818CF8] font-medium">📋 របៀបភ្ជាប់ Facebook៖</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>បើក <span className="text-white font-medium">developers.facebook.com</span></li>
                    <li>បង្កើត App ថ្មី (Business type)</li>
                    <li>បន្ថែម Facebook Login product</li>
                    <li>ទៅ Graph API Explorer</li>
                    <li>ជ្រើសរើស Page របស់អ្នក</li>
                    <li>កំណត់ permissions៖ <span className="text-white font-medium">pages_messaging, pages_manage_metadata</span></li>
                    <li>ចម្លង <span className="text-white font-medium">Page Access Token</span></li>
                  </ol>
                  <p className="text-yellow-400">⚠️ Token ត្រូវតែជា Page Access Token មិនមែន User Token!</p>
                </div>
              )}

              {setupPlatform === "facebook" ? (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Facebook Page Access Token
                  </label>
                  <input
                    type="password"
                    value={facebookToken}
                    onChange={(e) => setFacebookToken(e.target.value)}
                    placeholder="EAAxxxx... (Page Access Token)"
                    className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">Token ចាប់ផ្តើមដោយ EAA ឬ EAAG</p>
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
                    placeholder="123456789:ABCdefGHI... (Bot Token)"
                    className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-mono text-xs"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">Token មានរូបភាព៖ លេខ:អក្សរ</p>
                </div>
              )}

              <button
                onClick={handleVerifyToken}
                disabled={verifying || (!facebookToken && !telegramToken)}
                className="w-full py-2 bg-[#242933] text-white rounded-xl text-sm hover:bg-[#2E3340] disabled:opacity-50"
              >
                {verifying ? "កំពុងពិនិត្យ..." : "✅ ពិនិត្យ Token"}
              </button>

              {verifiedInfo && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-green-400 text-sm font-medium">✓ Token ត្រឹមត្រូវ!</p>
                  <p className="text-white text-sm mt-1">
                    {setupPlatform === "facebook"
                      ? `📄 Page: ${verifiedInfo.name}`
                      : `🤖 Bot: @${verifiedInfo.username}`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  💬 សារស្វាគមន៍
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
                  🧠 System Prompt (ជម្រើស)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                  placeholder="ឧ. អ្នកជា AI ជំនួយការសម្រាប់ហាងទូរសព្ទ..."
                  className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>

              {setupPlatform === "facebook" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      💬 Comment Auto-Reply Prompt (ជម្រើស)
                    </label>
                    <textarea
                      value={commentReplyPrompt}
                      onChange={(e) => setCommentReplyPrompt(e.target.value)}
                      rows={3}
                      placeholder="ឧ. ឆ្លើយតបជាភាសាខ្មែរដោយរាក់ទាក់ និងផ្តល់ព័ត៌មានអំពីផលិតផល..."
                      className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] resize-none"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">AI នឹងប្រើ prompt នេះដើម្បីឆ្លើយតប comments ស្វ័យប្រវត្តិ</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      📝 Auto-Post Prompt (ជម្រើស)
                    </label>
                    <textarea
                      value={autoPostPrompt}
                      onChange={(e) => setAutoPostPrompt(e.target.value)}
                      rows={2}
                      placeholder="ឧ. បង្កើត post អំពីការបញ្ជាទិញទូរសព្ទ ជាមួយ emoji និង Hashtag"
                      className="w-full px-4 py-3 rounded-xl bg-[#171A21] border border-[#242933] text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] resize-none"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">AI នឹងប្រើ prompt នេះដើម្បីបង្កើត post ស្វ័យប្រវត្តិ</p>
                  </div>
                </>
              )}

              <button
                onClick={handleCreateAgent}
                disabled={loading || (!facebookToken && !telegramToken)}
                className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "កំពុងបង្កើត..." : "🤖 បង្កើត Agent"}
              </button>
            </div>
          )}

          {/* Conversation Detail View */}
          {activeTab === "conversations" && selectedConv && (
            <div className="space-y-4">
              {/* Back button + User info header */}
              <div className="flex items-center gap-3 p-3 bg-[#171A21] border border-[#242933] rounded-xl">
                <button
                  onClick={() => setSelectedConv(null)}
                  className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] text-sm"
                >
                  ← ថយក្រោយ
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span className="font-bold text-white text-base">
                      {selectedConv.userName || `User ${selectedConv.userId}`}
                    </span>
                    {getPlatformBadge(selectedConv.platform === "telegram" ? "telegram" : "facebook")}
                  </div>
                  <p className="text-[10px] text-[#64748B] ml-8">
                    ID: {selectedConv.userId} • {selectedConv.messages.length} សារ • {formatTime(selectedConv.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto p-2">
                {selectedConv.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-[#6366F1]/15 text-[#CBD5E1] rounded-bl-sm"
                          : "bg-[#22C55E]/15 text-[#CBD5E1] rounded-br-sm"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.role === "user" ? (
                          <>
                            <span className="text-xs">👤</span>
                            <span className="text-[10px] font-medium text-[#818CF8]">
                              {selectedConv.userName || "User"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs">🤖</span>
                            <span className="text-[10px] font-medium text-green-400">
                              {msg.role === "assistant" ? "Admin / AI" : "AI"}
                            </span>
                          </>
                        )}
                        <span className="text-[9px] text-[#64748B] ml-auto">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <div className="flex items-center gap-2 p-3 bg-[#171A21] border border-[#242933] rounded-xl">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply(selectedConv);
                    }
                  }}
                  placeholder="វាយសារឆ្លើយតបទៅអ្នកប្រើ..."
                  className="flex-1 px-3 py-2 bg-[#0B0D10] border border-[#242933] rounded-lg text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
                  disabled={replying}
                />
                <button
                  onClick={() => handleReply(selectedConv)}
                  disabled={!replyText.trim() || replying}
                  className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {replying ? "⏳" : "📤 ផ្ញើ"}
                </button>
              </div>
            </div>
          )}

          {/* Conversations List */}
          {activeTab === "conversations" && selectedAgent && !selectedConv && (
            <div className="space-y-3">
              <p className="text-xs text-[#64748B] mb-2">
                ចុចលើសារដើម្បីមើល និងឆ្លើយតប
              </p>
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8]">
                  <p>មិនទាន់មានសារនៅឡើយ</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className="w-full text-left p-4 bg-[#171A21] border border-[#242933] rounded-xl hover:border-[#6366F1]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <span className="font-bold text-white">
                          {conv.userName || `User ${conv.userId}`}
                        </span>
                        {getPlatformBadge(conv.platform === "telegram" ? "telegram" : "facebook")}
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#94A3B8]">
                        {conv.messages.length} សារ
                      </span>
                      <span className="text-[10px] text-[#64748B]">•</span>
                      <span className="text-xs text-[#64748B] truncate flex-1">
                        {conv.messages[conv.messages.length - 1]?.content.slice(0, 60)}...
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
