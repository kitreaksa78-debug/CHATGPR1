import React, { useRef, useState, useEffect } from "react";
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Globe,
  X,
  FileText,
} from "lucide-react";
import { Attachment } from "../types.js";

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[], webSearch: boolean) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  onOpenCamModal?: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  webSearchEnabled,
  onToggleWebSearch,
}) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [text]);

  // Handle paste events (e.g. pasting screenshots from clipboard)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isCodeOrText =
      file.type.startsWith("text/") ||
      file.type.includes("json") ||
      file.type.includes("javascript") ||
      file.type.includes("typescript") ||
      file.type.includes("markdown") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".tsx") ||
      file.name.endsWith(".jsx") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1];

      const newAttachment: Attachment = {
        id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: file.name,
        type: file.type || (isCodeOrText ? "text/plain" : "application/octet-stream"),
        size: file.size,
        dataUrl,
        base64Data,
        previewUrl: isImage ? dataUrl : undefined,
        category: isImage ? "image" : isCodeOrText ? "code" : "document",
      };

      setAttachments((prev) => [...prev, newAttachment]);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => processFile(file));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(text.trim(), attachments, webSearchEnabled);
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Speech Recognition
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ Voice Speech Recognition ទេ។");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      // Default to Khmer language with fallback
      recognition.lang = "km-KH";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "language-not-supported") {
          // Fallback to English
          recognition.lang = "en-US";
          recognition.start();
          return;
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      console.error("Voice recognition initialization error:", e);
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-4 sm:pb-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl bg-[#171A21] border transition-all shadow-xl ${
          dragOver
            ? "border-[#6366F1] ring-2 ring-[#6366F1]/30 bg-[#1C2028]"
            : "border-[#242933] focus-within:border-[#6366F1]/60 focus-within:ring-1 focus-within:ring-[#6366F1]/20"
        }`}
      >
        {/* Attachment Thumbnails Tray */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 p-3 border-b border-[#242933]/60 bg-[#14171E] rounded-t-2xl">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-[#1C2028] border border-[#2D3545] shadow-md animate-fadeIn"
              >
                {att.category === "image" ? (
                  <img
                    src={att.previewUrl || att.dataUrl}
                    alt={att.name}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#242933] flex items-center justify-center text-[#818CF8]">
                    <FileText className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 pr-1 max-w-[120px]">
                  <p className="text-[11px] font-medium text-white truncate">{att.name}</p>
                  <p className="text-[9px] text-[#94A3B8]">
                    {(att.size / 1024).toFixed(0)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#2D3545] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-3 sm:p-3.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="សួរអ្វីក៏បាន... / Ask anything, math problem, code, or generate image..."
            rows={1}
            className="w-full bg-transparent text-[#F8FAFC] placeholder-[#64748B] text-sm sm:text-base focus:outline-none resize-none max-h-44 font-khmer leading-relaxed"
          />

          {/* Bottom Bar: Action Buttons & Send */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#1E232E]">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md,.js,.ts,.tsx,.jsx,.py,.html,.css"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#242933] transition-colors"
                title="ភ្ជាប់ឯកសារ ឬរូបភាព (Attach Files / Images)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? "bg-[#EF4444] text-white animate-pulse shadow-lg shadow-[#EF4444]/30"
                    : "text-[#94A3B8] hover:text-white hover:bg-[#242933]"
                }`}
                title={isRecording ? "កំពុងស្តាប់... (Stop Recording)" : "និយាយតាមសំឡេង (Voice Input)"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Web Search Grounding Toggle */}
              <button
                type="button"
                onClick={onToggleWebSearch}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-khmer font-medium transition-all ${
                  webSearchEnabled
                    ? "bg-[#6366F1]/20 border border-[#6366F1] text-[#818CF8]"
                    : "text-[#94A3B8] hover:text-white hover:bg-[#242933] border border-transparent"
                }`}
                title="Toggle Web Search Grounding"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web Search</span>
              </button>
            </div>

            {/* Right: Send or Stop Button */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold font-khmer transition-all shadow-lg shadow-[#EF4444]/20"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>បញ្ឈប់ / Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!text.trim() && attachments.length === 0}
                  onClick={handleSend}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-lg shadow-[#6366F1]/30 hover:opacity-95 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-[11px] text-[#64748B] font-khmer">
          CHAT GPR អាចធ្វើការវិភាគរូបភាព ឯកសារ បង្កើតរូបភាព និងដោះស្រាយលំហាត់ស្វ័យប្រវត្តិ
        </p>
      </div>
    </div>
  );
};
