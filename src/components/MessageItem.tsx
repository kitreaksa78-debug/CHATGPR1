import React, { useState } from "react";
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
  ImageIcon,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Message, IntentCategory, VisualExplanation } from "../types.js";
import { speakText, stopSpeaking } from "../utils/audio.js";
import { GeneratedImage } from "./GeneratedImage.js";
import { VisualExplanationCard } from "./VisualExplanationCard.js";

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onOpenImageViewer: (imageUrl: string, message: Message) => void;
  onOpenVisualViewer?: (visual: VisualExplanation) => void;
  onFeedback?: (messageId: string, liked: boolean) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onOpenImageViewer,
  onOpenVisualViewer,
  onFeedback,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

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
      const textToRead = message.content || message.generatedImage?.prompt || "";
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

  const getIntentBadge = (intent?: IntentCategory, hasVisual?: boolean) => {
    if (hasVisual) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border text-[#818CF8] bg-[#6366F1]/10 border-[#6366F1]/30 mb-3">
          <Layers className="w-3.5 h-3.5" />
          <span>Visual Explanation</span>
        </div>
      );
    }

    if (!intent) return null;
    const configs: Record<IntentCategory, { label: string; icon: any; color: string }> = {
      image_gen: { label: "Image Generation", icon: ImageIcon, color: "text-[#EC4899] bg-[#EC4899]/10 border-[#EC4899]/30" },
      math: { label: "Math & Reasoning", icon: Calculator, color: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30" },
      vision: { label: "Vision Analysis", icon: Eye, color: "text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/30" },
      document: { label: "Document AI", icon: FileText, color: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30" },
      coding: { label: "Code Assistant", icon: Code, color: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30" },
      search: { label: "Web Grounding", icon: Globe, color: "text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/30" },
      translation: { label: "Translation", icon: Sparkles, color: "text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30" },
      text: { label: "CHAT GPR AI", icon: Sparkles, color: "text-[#818CF8] bg-[#818CF8]/10 border-[#818CF8]/30" },
    };

    const config = configs[intent] || configs.text;
    const IconComponent = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${config.color} mb-3`}>
        <IconComponent className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </div>
    );
  };

  return (
    <div
      className={`w-full py-4 sm:py-6 px-3 sm:px-6 transition-colors ${
        isUser ? "bg-transparent" : "bg-[#111318]/60 border-y border-[#1E232E]/60"
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 sm:gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-[#242933] border border-[#323946] flex items-center justify-center text-white text-xs font-bold font-sans shadow-md">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#EC4899] p-0.5 shadow-md shadow-[#6366F1]/20">
              <div className="w-full h-full bg-[#0B0D10] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#818CF8]" />
              </div>
            </div>
          )}
        </div>

        {/* Message Content Body */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Top meta & Intent badge for AI */}
          {!isUser && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-xs font-sans">CHAT GPR</span>
                {getIntentBadge(message.intent, !!message.visualExplanation)}
              </div>

              <span className="text-[11px] text-[#64748B]">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
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
                <p className="font-semibold font-khmer text-white">
                  មានបញ្ហាក្នុងការដំណើរការ / Notice
                </p>
                <div className="text-xs text-[#FCA5A5] font-khmer whitespace-pre-line leading-relaxed">
                  {message.error}
                </div>
                {onRegenerate && (
                  <div className="pt-1.5">
                    <button
                      onClick={onRegenerate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-white transition-all text-xs font-khmer font-medium active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ព្យាយាមម្តងទៀត / Retry</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Generation in Progress State */}
          {message.isStreaming && message.intent === "image_gen" && !message.generatedImage && (
            <div className="my-3 p-4 rounded-2xl bg-[#14171E] border border-[#EC4899]/30 max-w-xl space-y-3 shadow-xl shadow-[#EC4899]/5 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#EC4899]/20 text-[#EC4899]">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white font-khmer">
                    🎨 CHAT GPR កំពុងបង្កើតរូបភាព...
                  </p>
                  <p className="text-[11px] text-[#F472B6] font-khmer">
                    កំពុងដំណើរការបង្កើតរូបភាពតាមការពិពណ៌នាដោយប្រើ Gemini AI...
                  </p>
                </div>
              </div>
              <div className="h-48 sm:h-64 rounded-xl bg-gradient-to-br from-[#1E232E] via-[#242933] to-[#171A21] flex flex-col items-center justify-center gap-3 border border-[#242933]">
                <div className="w-9 h-9 rounded-full border-3 border-[#EC4899] border-t-transparent animate-spin" />
                <span className="text-xs text-[#94A3B8] font-khmer">
                  កំពុងដំណើរការបង្កើតរូបភាព...
                </span>
              </div>
            </div>
          )}

          {/* Intelligent Visual Explanation Card (Diagram/SVG/Mermaid) */}
          {message.visualExplanation && (
            <VisualExplanationCard
              visual={message.visualExplanation}
              onOpenLightbox={onOpenVisualViewer}
              onRegenerate={onRegenerate ? () => onRegenerate() : undefined}
            />
          )}

          {/* Main Text Content */}
          {message.content && (
            <div className="markdown-body font-khmer text-sm sm:text-[15px] leading-relaxed">
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
                            <Copy className="w-3 h-3" />
                            <span>Copy code</span>
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

          {/* Generated Image Component */}
          {message.generatedImage && (
            <GeneratedImage
              image={message.generatedImage}
              onOpenViewer={(url) => onOpenImageViewer(url, message)}
              onRegenerate={onRegenerate ? () => onRegenerate() : undefined}
            />
          )}

          {/* Web Search Sources Grounding */}
          {message.groundingSources && message.groundingSources.length > 0 && (
            <div className="p-3 rounded-xl bg-[#171A21] border border-[#242933] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#818CF8]">
                <Globe className="w-3.5 h-3.5" />
                <span>ប្រភពព័ត៌មានពី Web Search / Sources:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.groundingSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C2028] hover:bg-[#282E3A] border border-[#242933] text-[11px] text-[#CBD5E1] hover:text-white transition-colors max-w-xs truncate"
                  >
                    <ExternalLink className="w-3 h-3 text-[#64748B]" />
                    <span className="truncate">{source.title || source.uri}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Streaming blinking cursor for regular text */}
          {message.isStreaming && message.intent !== "image_gen" && (
            <span className="inline-block w-2 h-4 bg-[#818CF8] animate-pulse ml-1 align-middle rounded-sm" />
          )}

          {/* Bottom Action Controls (for Assistant messages) */}
          {!isUser && !message.isStreaming && (message.content || message.generatedImage || message.visualExplanation) && (
            <div className="flex items-center gap-1 pt-2 text-[#94A3B8]">
              {message.content && (
                <button
                  onClick={() => handleCopy(message.content)}
                  className="p-1.5 hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                  title="ចម្លងអត្ថបទ / Copy text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}

              {message.content && (
                <button
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isAudioPlaying
                      ? "text-[#818CF8] bg-[#6366F1]/20 animate-pulse"
                      : "hover:text-white hover:bg-[#1C2028]"
                  }`}
                  title={isAudioPlaying ? "Stop Reading" : "អានសំឡេង / Read Aloud"}
                >
                  {isAudioPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {onFeedback && (
                <>
                  <button
                    onClick={() => onFeedback(message.id, true)}
                    className={`p-1.5 rounded-lg hover:bg-[#1C2028] transition-colors ${
                      message.liked === true ? "text-green-400" : "hover:text-white"
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, false)}
                    className={`p-1.5 rounded-lg hover:bg-[#1C2028] transition-colors ${
                      message.liked === false ? "text-red-400" : "hover:text-white"
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
                  className="p-1.5 hover:text-white rounded-lg hover:bg-[#1C2028] transition-colors"
                  title="បង្កើតចម្លើយឡើងវិញ / Regenerate"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
