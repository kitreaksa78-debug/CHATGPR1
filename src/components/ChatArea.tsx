import React, { useRef, useEffect } from "react";
import {
  Calculator,
  ImageIcon,
  Eye,
  Code,
  FileText,
  Globe,
  Sparkles,
  ArrowRight,
  Layers,
  CloudSun,
} from "lucide-react";
import { Message, QuickPrompt, VisualExplanation } from "../types.js";
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

const STARTER_PROMPTS: QuickPrompt[] = [
  {
    id: "visual_math",
    titleKm: "ពន្យល់ទ្រឹស្តីបទពីតាករ + គំនូសតាង",
    titleEn: "Pythagorean Theorem Visual",
    promptKm: "ពន្យល់ទ្រឹស្តីបទពីតាករឱ្យងាយយល់ និងគូររូបត្រីកោណកែងបង្ហាញរូបមន្ត a² + b² = c²",
    promptEn: "Explain the Pythagorean theorem with a visual right-angle triangle diagram and formulas",
    category: "math",
    icon: "Calculator",
  },
  {
    id: "visual_science",
    titleKm: "វដ្តនៃទឹកក្នុងធម្មជាតិ + ដ្យាក្រាម",
    titleEn: "Water Cycle Visual Diagram",
    promptKm: "ពន្យល់ពីវដ្តនៃទឹកក្នុងធម្មជាតិ និងរបៀបកើតមានទឹកភ្លៀងជាដ្យាក្រាម",
    promptEn: "Explain how the natural water cycle works with a clear step-by-step diagram",
    category: "math",
    icon: "CloudSun",
  },
  {
    id: "visual_architecture",
    titleKm: "ស្ថាបត្យកម្ម Frontend & Backend",
    titleEn: "Frontend & Backend Architecture",
    promptKm: "ពន្យល់ពីរបៀបដែល Frontend, Backend API និង Database តភ្ជាប់គ្នាជាដ្យាក្រាម",
    promptEn: "Explain the architecture connecting Frontend, Backend API, and Database with a flowchart",
    category: "coding",
    icon: "Layers",
  },
  {
    id: "image_1",
    titleKm: "បង្កើតរូបភាព AI (Creative Art)",
    titleEn: "Generate AI Art",
    promptKm: "បង្កើតរូបភាពប្រាសាទអង្គរវត្តនៅពេលថ្ងៃរះ មានពន្លឺពណ៌មាសស្អាត",
    promptEn: "Generate a realistic golden sunrise over Angkor Wat reflecting on the water",
    category: "image_gen",
    icon: "ImageIcon",
  },
  {
    id: "vision_1",
    titleKm: "វិភាគរូបភាព & OCR",
    titleEn: "Vision & OCR Analysis",
    promptKm: "ជួយអានអក្សរក្នុងរូបភាព និងពន្យល់ពីអ្វីដែលកំពុងកើតឡើង",
    promptEn: "Analyze the uploaded image, read visible text, and explain the scene",
    category: "vision",
    icon: "Eye",
  },
  {
    id: "search_1",
    titleKm: "ស្រាវជ្រាវ Web Grounding",
    titleEn: "Real-time Web Search",
    promptKm: "ស្វែងរកព័ត៌មានបច្ចេកវិទ្យា AI ចុងក្រោយបំផុតក្នុងឆ្នាំ ២០២៦",
    promptEn: "Search for the latest AI technology trends and breakthroughs in 2026",
    category: "search",
    icon: "Globe",
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSelectPrompt,
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

  const getIcon = (name: string) => {
    switch (name) {
      case "Calculator":
        return <Calculator className="w-5 h-5 text-[#EC4899]" />;
      case "CloudSun":
        return <CloudSun className="w-5 h-5 text-[#38BDF8]" />;
      case "Layers":
        return <Layers className="w-5 h-5 text-[#818CF8]" />;
      case "ImageIcon":
        return <ImageIcon className="w-5 h-5 text-[#F43F5E]" />;
      case "Eye":
        return <Eye className="w-5 h-5 text-[#A855F7]" />;
      case "Code":
        return <Code className="w-5 h-5 text-[#10B981]" />;
      case "FileText":
        return <FileText className="w-5 h-5 text-[#F59E0B]" />;
      case "Globe":
        return <Globe className="w-5 h-5 text-[#6366F1]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#818CF8]" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col justify-between">
      {messages.length === 0 ? (
        /* Welcome Hero Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full text-center my-auto animate-fadeIn">
          {/* Logo & Headline */}
          <div className="flex flex-col items-center gap-3.5 mb-8">
            <Logo size="xl" showText={false} />
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                CHAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] via-[#A78BFA] to-[#F472B6]">GPR</span>
              </h1>
              <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] font-khmer">
                សួស្តី! ខ្ញុំជា CHAT GPR 👋
              </h2>
              <p className="text-sm text-[#94A3B8] font-khmer max-w-lg mx-auto">
                ជំនួយការ AI ឆ្លាតវៃដែលអាចដោះស្រាយលំហាត់ វិភាគរូបភាព បង្កើតរូបភាព និងបង្កើត <span className="text-[#818CF8] font-semibold">គំនូសតាងពន្យល់ស្វ័យប្រវត្តិ (Visual Explanations)</span>
              </p>
            </div>
          </div>

          {/* Quick Capability Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl text-left">
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectPrompt(item.promptKm)}
                className="group relative p-4 rounded-2xl bg-[#14171E] hover:bg-[#171A21] border border-[#242933] hover:border-[#6366F1]/40 transition-all text-left shadow-lg hover:shadow-[#6366F1]/10 flex flex-col justify-between min-h-[115px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-[#1C2028] border border-[#2D3545]">
                      {getIcon(item.icon)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-semibold text-xs text-white font-khmer mb-1">
                    {item.titleKm}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] font-khmer line-clamp-2 leading-relaxed">
                    {item.promptKm}
                  </p>
                </div>
              </button>
            ))}
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
