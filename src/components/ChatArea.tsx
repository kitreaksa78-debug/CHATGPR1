import React, { useRef, useEffect } from "react";
import { Message, VisualExplanation } from "../types.js";
import { MessageItem } from "./MessageItem.js";
import { Logo } from "./Logo.js";

interface ChatAreaProps {
  messages: Message[];
  onSelectPrompt: (promptText: string) => void;
  onRegenerate: (index: number) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onOpenImageViewer: (imageUrl: string, message: Message) => void;
  onOpenVisualViewer?: (visual: VisualExplanation) => void;
  onFeedback: (messageId: string, liked: boolean) => void;
  isStreaming?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onRegenerate,
  onEditMessage,
  onOpenImageViewer,
  onOpenVisualViewer,
  onFeedback,
  isStreaming,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    messages,
    messages[messages.length - 1]?.content,
    messages[messages.length - 1]?.visualExplanation,
  ]);

  // Check if the last message is a streaming AI message with no content yet
  const lastMsg = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMsg?.role === "assistant" && !lastMsg?.content && !lastMsg?.visualExplanation && !lastMsg?.error;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0 w-full">
      {messages.length === 0 ? (
        /* Clean Minimalist Welcome Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full text-center my-auto animate-fadeIn">
          <div className="flex flex-col items-center gap-3">
            <Logo size="lg" showText={false} />
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                CHAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#818CF8] to-[#C084FC]">GPR</span>
              </h1>
              <p className="text-sm sm:text-base text-[#94A3B8]">
                How can I help you today?
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Messages Stream */
        <div className="flex-1 w-full pb-4">
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id || index}
              message={msg}
              onRegenerate={msg.role === "assistant" ? () => onRegenerate(index) : undefined}
              onEditMessage={msg.role === "user" && onEditMessage ? (newContent) => onEditMessage(msg.id, newContent) : undefined}
              onOpenImageViewer={(url) => onOpenImageViewer(url, msg)}
              onOpenVisualViewer={onOpenVisualViewer}
              onFeedback={onFeedback}
              isLast={index === messages.length - 1}
            />
          ))}

          {/* ChatGPT-style typing indicator */}
          {showTypingIndicator && (
            <div className="w-full bg-[#111318]/60 border-y border-[#1E232E]/40">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="w-2 h-2 rounded-full bg-[#818CF8] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#818CF8] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#818CF8] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
