import React, { useRef, useEffect } from "react";
import { Message, VisualExplanation } from "../types.js";
import { MessageItem } from "./MessageItem.js";
import { Logo } from "./Logo.js";

interface ChatAreaProps {
  messages: Message[];
  onSelectPrompt: (promptText: string) => void;
  onRegenerate: (index: number) => void;
  onOpenImageViewer: (imageUrl: string, message: Message) => void;
  onOpenVisualViewer?: (visual: VisualExplanation) => void;
  onFeedback: (messageId: string, liked: boolean) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onRegenerate,
  onOpenImageViewer,
  onOpenVisualViewer,
  onFeedback,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    messages,
    messages[messages.length - 1]?.content,
    messages[messages.length - 1]?.generatedImage,
    messages[messages.length - 1]?.visualExplanation,
  ]);

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
              <p className="text-sm sm:text-base text-[#94A3B8] font-khmer">
                តើខ្ញុំអាចជួយអ្វីអ្នកនៅថ្ងៃនេះបានដែរ?
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
              onOpenImageViewer={(url) => onOpenImageViewer(url, msg)}
              onOpenVisualViewer={onOpenVisualViewer}
              onFeedback={onFeedback}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
