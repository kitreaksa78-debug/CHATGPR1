import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar.js";
import { Header } from "./components/Header.js";
import { ChatArea } from "./components/ChatArea.js";
import { ChatInput } from "./components/ChatInput.js";
import { CameraModal } from "./components/CameraModal.js";
import { ImageViewerModal } from "./components/ImageViewerModal.js";
import { SettingsModal } from "./components/SettingsModal.js";
import {
  Conversation,
  Message,
  Attachment,
  ChatSettings,
  GeneratedImage,
  VisualExplanation,
} from "./types.js";
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  createNewConversation,
  getActiveChatId,
  setActiveChatId,
} from "./utils/storage.js";

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [settings, setSettings] = useState<ChatSettings>(loadSettings);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Modals
  const [isCamOpen, setIsCamOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [imageViewerState, setImageViewerState] = useState<{
    isOpen: boolean;
    imageUrl?: string;
    generatedInfo?: GeneratedImage;
    visualExplanationInfo?: VisualExplanation;
  }>({
    isOpen: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize conversations from localStorage
  useEffect(() => {
    const loaded = loadConversations();
    if (loaded.length > 0) {
      setConversations(loaded);
      const savedActive = getActiveChatId();
      if (savedActive && loaded.some((c) => c.id === savedActive)) {
        setActiveChatIdState(savedActive);
      } else {
        setActiveChatIdState(loaded[0].id);
        setActiveChatId(loaded[0].id);
      }
    } else {
      const initial = createNewConversation();
      setConversations([initial]);
      setActiveChatIdState(initial.id);
      setActiveChatId(initial.id);
      saveConversations([initial]);
    }
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const currentConversation =
    conversations.find((c) => c.id === activeChatId) || null;

  // Handlers for conversations
  const handleSelectChat = (id: string) => {
    setActiveChatIdState(id);
    setActiveChatId(id);
  };

  const handleNewChat = (isTemporary = false) => {
    const newConv = createNewConversation(isTemporary);
    setConversations((prev) => [newConv, ...prev]);
    setActiveChatIdState(newConv.id);
    setActiveChatId(newConv.id);
  };

  const handleDeleteChat = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeChatId === id) {
        if (next.length > 0) {
          setActiveChatIdState(next[0].id);
          setActiveChatId(next[0].id);
        } else {
          const fresh = createNewConversation();
          next.push(fresh);
          setActiveChatIdState(fresh.id);
          setActiveChatId(fresh.id);
        }
      }
      return next;
    });
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleToggleArchive = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isArchived: !c.isArchived } : c))
    );
  };

  const handleClearCurrentChat = () => {
    if (!activeChatId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, messages: [] } : c))
    );
  };

  const handleClearAllConversations = () => {
    const initial = createNewConversation();
    setConversations([initial]);
    setActiveChatIdState(initial.id);
    setActiveChatId(initial.id);
    saveConversations([initial]);
  };

  const handleSaveSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleWebSearch = () => {
    const updated = { ...settings, webSearchEnabled: !settings.webSearchEnabled };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleToggleTemporary = () => {
    handleNewChat(!currentConversation?.isTemporary);
  };

  const handleFeedback = (messageId: string, liked: boolean) => {
    if (!activeChatId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, liked: m.liked === liked ? null : liked } : m
          ),
        };
      })
    );
  };

  // Main Send Message Pipeline with SSE
  const handleSendMessage = async (
    text: string,
    attachments: Attachment[] = [],
    webSearch = settings.webSearchEnabled
  ) => {
    if (!text.trim() && attachments.length === 0) return;

    let targetConv = currentConversation;
    if (!targetConv) {
      targetConv = createNewConversation();
      setConversations((prev) => [targetConv!, ...prev]);
      setActiveChatIdState(targetConv.id);
      setActiveChatId(targetConv.id);
    }

    const userMessage: Message = {
      id: "msg_user_" + Date.now(),
      role: "user",
      content: text,
      attachments,
      createdAt: Date.now(),
    };

    const assistantMessageId = "msg_ai_" + (Date.now() + 1);
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
      createdAt: Date.now(),
    };

    const updatedMessages = [...targetConv.messages, userMessage, initialAssistantMessage];
    const isFirstUserTurn = targetConv.messages.length === 0;

    // Update conversation in state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetConv!.id
          ? {
              ...c,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: targetConv.messages,
          prompt: text,
          attachments,
          webSearchEnabled: webSearch,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let accumulatedContent = "";
      let detectedIntent: any = undefined;
      let finalGeneratedImage: GeneratedImage | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.type === "intent") {
                detectedIntent = parsed.intent;
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  intent: parsed.intent,
                });
              } else if (parsed.type === "visual_explanation_start") {
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  visualExplanation: {
                    id: "visual_" + Date.now(),
                    type: "svg",
                    visualType: parsed.visualType,
                    title: parsed.title,
                    titleKm: parsed.title,
                    data: "",
                    status: "generating",
                    createdAt: Date.now(),
                  },
                });
              } else if (parsed.type === "visual_explanation_ready") {
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  visualExplanation: parsed.visual,
                });
              } else if (parsed.type === "token") {
                accumulatedContent += parsed.text;
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  content: accumulatedContent,
                  intent: detectedIntent,
                  isStreaming: true,
                });
              } else if (parsed.type === "grounding") {
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  groundingSources: parsed.sources,
                });
              } else if (parsed.type === "image_gen_success") {
                finalGeneratedImage = {
                  imageUrl: parsed.imageUrl,
                  prompt: parsed.prompt,
                  revisedPrompt: parsed.revisedPrompt,
                  createdAt: Date.now(),
                };
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  generatedImage: finalGeneratedImage,
                  intent: "image_gen",
                  isStreaming: false,
                });
              } else if (parsed.type === "image_gen_error" || parsed.type === "error") {
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  error: parsed.error,
                  isStreaming: false,
                });
              } else if (parsed.type === "done") {
                updateAssistantMessage(targetConv.id, assistantMessageId, {
                  isStreaming: false,
                });
              }
            } catch (e) {
              console.warn("SSE parse error", e, dataStr);
            }
          }
        }
      }

      // Mark done streaming
      updateAssistantMessage(targetConv.id, assistantMessageId, {
        isStreaming: false,
      });

      // Auto Title Generation if this was first message (debounced to avoid burst rate limits)
      if (isFirstUserTurn && settings.autoTitle && !targetConv.isTemporary) {
        setTimeout(() => {
          fetch("/api/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: text,
              response: accumulatedContent || finalGeneratedImage?.prompt || "",
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.title) {
                handleRenameChat(targetConv!.id, data.title);
              }
            })
            .catch((e) => console.warn("Failed to auto title", e));
        }, 1500);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        updateAssistantMessage(targetConv.id, assistantMessageId, {
          isStreaming: false,
        });
      } else {
        updateAssistantMessage(targetConv.id, assistantMessageId, {
          error: err?.message || "Failed to communicate with CHAT GPR backend.",
          isStreaming: false,
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const updateAssistantMessage = (
    convId: string,
    messageId: string,
    partial: Partial<Message>
  ) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, ...partial } : m
          ),
        };
      })
    );
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleRegenerate = (index: number) => {
    if (!currentConversation) return;
    const history = currentConversation.messages.slice(0, index);
    const lastUserMsg = history[history.length - 1];
    if (lastUserMsg && lastUserMsg.role === "user") {
      // Remove current and downstream assistant message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversation.id
            ? { ...c, messages: history.slice(0, -1) }
            : c
        )
      );
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments);
    }
  };

  const handleOpenImageViewer = (imageUrl: string, message: Message) => {
    setImageViewerState({
      isOpen: true,
      imageUrl,
      generatedInfo: message.generatedImage,
      visualExplanationInfo: undefined,
    });
  };

  const handleOpenVisualViewer = (visual: VisualExplanation) => {
    setImageViewerState({
      isOpen: true,
      imageUrl: visual.type === "image" ? visual.data : undefined,
      visualExplanationInfo: visual,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0D10] text-[#F8FAFC]">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={() => handleNewChat(false)}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative bg-[#0B0D10]">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          currentConversation={currentConversation}
          webSearchEnabled={settings.webSearchEnabled}
          onToggleWebSearch={handleToggleWebSearch}
          isTemporary={Boolean(currentConversation?.isTemporary)}
          onToggleTemporary={handleToggleTemporary}
          onNewChat={() => handleNewChat(false)}
          onClearCurrentChat={handleClearCurrentChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Chat Stream Area */}
        <ChatArea
          messages={currentConversation?.messages || []}
          onSelectPrompt={(p) => handleSendMessage(p)}
          onRegenerate={handleRegenerate}
          onOpenImageViewer={handleOpenImageViewer}
          onOpenVisualViewer={handleOpenVisualViewer}
          onFeedback={handleFeedback}
        />

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
          onOpenCamModal={() => setIsCamOpen(true)}
          webSearchEnabled={settings.webSearchEnabled}
          onToggleWebSearch={handleToggleWebSearch}
        />
      </main>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCamOpen}
        onClose={() => setIsCamOpen(false)}
        onCapture={(att) => {
          handleSendMessage("", [att]);
        }}
      />

      {/* Image & Visual Lightbox Viewer */}
      <ImageViewerModal
        isOpen={imageViewerState.isOpen}
        onClose={() => setImageViewerState({ isOpen: false })}
        imageUrl={imageViewerState.imageUrl}
        generatedImageInfo={imageViewerState.generatedInfo}
        visualExplanationInfo={imageViewerState.visualExplanationInfo}
        onRegenerate={(prompt) => handleSendMessage(prompt)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearAllConversations={handleClearAllConversations}
      />
    </div>
  );
}
