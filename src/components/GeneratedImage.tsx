import React, { useState } from "react";
import { Maximize2, Sparkles } from "lucide-react";
import { GeneratedImage as GeneratedImageType } from "../types.js";

interface GeneratedImageProps {
  image: GeneratedImageType;
  onOpenViewer: (imageUrl: string) => void;
  onRegenerate?: (prompt: string) => void;
  onEditImage?: (image: GeneratedImageType) => void;
}

export const GeneratedImage: React.FC<GeneratedImageProps> = ({
  image,
  onOpenViewer,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      id="chat-gpr-generated-image-card"
      className="my-3 max-w-xl w-full rounded-2xl bg-[#14171E] border border-[#242933] overflow-hidden shadow-2xl transition-all hover:border-[#6366F1]/40 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#171A21] border-b border-[#242933]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-[#6366F1]/20 text-[#818CF8]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-white font-khmer">
            រូបភាពដែលបានបង្កើត
          </span>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        onClick={() => onOpenViewer(image.imageUrl)}
        className="relative cursor-pointer bg-black/40 overflow-hidden flex items-center justify-center min-h-[220px] sm:min-h-[300px] max-h-[480px]"
      >
        <img
          src={image.imageUrl}
          alt={image.prompt || "Generated image"}
          className="w-full h-full object-contain max-h-[460px] transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />

        {/* Floating Expand Overlay */}
        <div
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl bg-black/60 hover:bg-black text-white transition-all backdrop-blur-sm ${
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          title="ចុចដើម្បីពង្រីក / Click to enlarge"
        >
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>

      {/* Prompt Caption */}
      {image.prompt && (
        <div className="px-3.5 py-2 bg-[#12151B] border-t border-[#1E232E] text-xs text-[#94A3B8]">
          <p className="line-clamp-2 leading-relaxed">
            <span className="font-medium text-[#818CF8]">Prompt: </span>
            {image.prompt}
          </p>
        </div>
      )}
    </div>
  );
};
