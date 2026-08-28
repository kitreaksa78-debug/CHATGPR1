import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ExternalLink,
  Calculator,
  Code,
  FileText,
  Eye,
  Globe,
  AlertTriangle,
  Layers,
  Zap,
  Pencil,
  CheckCircle,
  X,
} from "lucide-react";
import { Message, IntentCategory, VisualExplanation } from "../types.js";
import { speakText, stopSpeaking } from "../utils/audio.js";
import { VisualExplanationCard } from "./VisualExplanationCard.js";
import { ChatGprIcon } from "./ChatGprIcon.js";
import { FileCard, type GeneratedFile } from "./FileCard.js";

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onEditMessage?: (newContent: string) => void;
  onOpenImageViewer: (imageUrl: string, message: Message) => void;
  onOpenVisualViewer?: (visual: VisualExplanation) => void;
  onFeedback?: (messageId: string, liked: boolean) => void;
  isLast?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onEditMessage,
  onOpenImageViewer,
  onOpenVisualViewer,
  onFeedback,
  isLast,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.style.height = "auto";
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  };

  const handleToggleSpeech = () => {
    if (isAudioPlaying) {
      stopSpeaking();
      setIsAudioPlaying(false);
    } else {
      const textToRead = message.content || "";
      if (textToRead) {
        setIsAudioPlaying(true);
        speakText(
          textToRead,
          () => setIsAudioPlaying(false),
          () => setIsAudioPlaying(false)
        );
      }
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEditMessage) {
      onEditMessage(editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const getIntentBadge = (intent?: IntentCategory, hasVisual?: boolean) => {
    if (hasVisual) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border text-[#818CF8] bg-[#6366F1]/10 border-[#6366F1]/30 mb-3">
          <Layers className="w-3.5 h-3.5" />
          <span>Visual Explanation</span>
        </div>
      );
    }

    if (!intent || intent === "text") return null;
    const configs: Record<IntentCategory, { label: string; icon: any; color: string }> = {

      image_gen: { label: "", icon: Sparkles, color: "" },
      math: { label: "Math & Reasoning", icon: Calculator, color: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30" },
      vision: { label: "Vision Analysis", icon: Eye, color: "text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30" },
      document: { label: "Document AI", icon: FileText, color: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30" },
      coding: { label: "Code Assistant", icon: Code, color: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30" },
      search: { label: "Web Search", icon: Globe, color: "text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/30" },
      translation: { label: "Translation", icon: Sparkles, color: "text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30" },
      file_gen: { label: "File Generation", icon: FileText, color: "text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30" },
      text: { label: "", icon: Sparkles, color: "" },
    };

    const config = configs[intent] || configs.text;
    if (!config.label) return null;
    const IconComponent = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${config.color} mb-3`}>
        <IconComponent className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </div>
    );
  };

  const getModelDisplayName = (model?: string, isFallback?: boolean) => {
    if (!model) return "CHAT GPR";
    if (isFallback) return model;
    if (model.includes("gemini")) return "Gemini";
    if (model.includes("gpt")) return "GPT";
    if (model.includes("claude")) return "Claude";
    if (model.includes("qwen")) return "Qwen";
    return model;
  };

  return (
    <div
      className={`w-full transition-colors ${
        isUser
          ? "bg-transparent"
          : "bg-[#111318]/60 border-y border-[#1E232E]/40"
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 pt-0.5">
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-[#242933] border border-[#323946] flex items-center justify-center text-white text-xs font-bold">
                U
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent">
                <ChatGprIcon className="w-7 h-7" glow={false} />
              </div>
            )}
          </div>

          {/* Message Content Body */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name + Model for AI */}
            {!isUser && !message.isStreaming && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">CHAT GPR</span>
                {message.modelUsed && (
                  <span className="text-[10px] text-[#64748B] bg-[#1C2028] px-1.5 py-0.5 rounded font-mono">
                    {getModelDisplayName(message.modelUsed, message.isFallback)}
                  </span>
                )}
              </div>
            )}

            {/* User Attachments Preview */}
            {isUser && message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-[#171A21] border border-[#242933] max-w-xs"
                  >
                    {att.category === "image" ? (
                      <img
                        src={att.previewUrl || att.dataUrl}
                        alt={att.name}
                        onClick={() => onOpenImageViewer(att.dataUrl, message)}
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="p-2 rounded-lg bg-[#242933] text-[#818CF8]">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-white truncate max-w-[140px]">{att.name}</p>
                      <p className="text-[10px] text-[#94A3B8]">
                        {(att.size / 1024).toFixed(1)} KB • {att.type.split("/")[1]?.toUpperCase() || "FILE"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error Message banner */}
            {message.error && (
              <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] flex items-start gap-3.5 text-xs shadow-lg shadow-[#EF4444]/5">
                <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-white">
                    មានបញ្ហា / Error
                  </p>
                  <div className="text-xs text-[#FCA5A5] whitespace-pre-line leading-relaxed">
                    {message.error}
                  </div>
                  {onRegenerate && (
                    <div className="pt-1.5">
                      <button
                        onClick={onRegenerate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-white transition-all text-xs font-medium active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual Explanation */}
            {message.visualExplanation && (
              <VisualExplanationCard
                visual={message.visualExplanation}
                onOpenLightbox={onOpenVisualViewer}
                onRegenerate={onRegenerate ? () => onRegenerate() : undefined}
              />
            )}

            {/* Search Status */}
            {message.searchStatus && !message.content && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#141820] border border-[#2A3241] animate-pulse">
                <div className="w-5 h-5 rounded-md bg-[#6366F1]/20 flex items-center justify-center">
                  {message.searchStatus === "searching" ? (
                    <Globe className="w-3.5 h-3.5 text-[#818CF8] animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#818CF8] animate-pulse" />
                  )}
                </div>
                <span className="text-xs text-[#818CF8] font-medium">
                  {message.searchMessage}
                </span>
              </div>
            )}

            {/* Intent Badge (only for non-text intents) */}
            {!isUser && getIntentBadge(message.intent, !!message.visualExplanation)}

            {/* Main Text Content */}
            {message.content && !isEditing && (
              <div className="markdown-body text-sm sm:text-[15px] leading-relaxed">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match && !String(children).includes("\n");

                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded-md bg-[#1C2028] border border-[#242933] text-[#F472B6] font-mono text-xs" {...props}>
                            {children}
                          </code>
                        );
                      }

                      const codeString = String(children).replace(/\n$/, "");
                      const lang = match ? match[1] : "code";

                      return (
                        <div className="relative my-3 rounded-xl overflow-hidden border border-[#242933] bg-[#0E1015] shadow-lg">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#171A21] border-b border-[#242933] text-xs text-[#94A3B8] font-mono">
                            <span className="uppercase font-semibold text-[#818CF8]">{lang}</span>
                            <button
                              onClick={() => handleCopy(codeString)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#242933] text-white hover:bg-[#323946] text-[11px] transition-colors"
                            >
                              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copied ? "Copied!" : "Copy"}</span>
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-[#F8FAFC] leading-relaxed">
                            <code>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                  }}
                >
                  {message.content}
                </Markdown>
              </div>
            )}

            {/* Edit Mode for User Messages */}
            {isUser && isEditing && (
              <div className="space-y-2">
                <textarea
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full p-3 rounded-xl bg-[#171A21] border border-[#6366F1] text-white text-sm focus:outline-none resize-none font-khmer leading-relaxed"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#6366F1] text-white text-xs font-medium hover:bg-[#5558E6] disabled:opacity-50 transition-colors"
                  >
                    Send & Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-lg bg-[#242933] text-[#94A3B8] text-xs font-medium hover:bg-[#323946] transition-colors"
                  >
                    Cancel
                  </button>
                  <span className="text-[10px] text-[#64748B] ml-2">
                    Enter to send • Esc to cancel
                  </span>
                </div>
              </div>
            )}

            {/* Generated File */}
            {message.generatedFile && (
              <FileCard
                file={message.generatedFile}
                onRetry={onRegenerate ? () => onRegenerate() : undefined}
              />
            )}

            {/* Streaming cursor */}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-[#818CF8] animate-pulse ml-1 align-middle rounded-sm" />
            )}

            {/* Bottom Action Controls (for both User and Assistant messages) */}
            {!message.isStreaming && (message.content || message.visualExplanation) && (
              <div className="flex items-center gap-0.5 pt-1 -ml-1">
                {/* User message: Edit + Copy */}
                {isUser && (
                  <>
                    {onEditMessage && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                        title="Edit message"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                      title="Copy text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}

                {/* Assistant message: Copy, Speech, Like, Dislike, Regenerate */}
                {!isUser && (
                  <>
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                      title="Copy text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {message.content && (
                      <button
                        onClick={handleToggleSpeech}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isAudioPlaying
                            ? "text-[#818CF8] bg-[#6366F1]/20 animate-pulse"
                            : "text-[#64748B] hover:text-white hover:bg-[#1C2028]"
                        }`}
                        title={isAudioPlaying ? "Stop Reading" : "Read Aloud"}
                      >
                        {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {onFeedback && (
                      <>
                        <button
                          onClick={() => onFeedback(message.id, true)}
                          className={`p-1.5 rounded-lg hover:bg-[#1C2028] transition-colors ${
                            message.liked === true ? "text-green-400" : "text-[#64748B] hover:text-white"
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onFeedback(message.id, false)}
                          className={`p-1.5 rounded-lg hover:bg-[#1C2028] transition-colors ${
                            message.liked === false ? "text-red-400" : "text-[#64748B] hover:text-white"
                          }`}
                          title="Poor response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="p-1.5 text-[#64748B] hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                        title="Regenerate"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
