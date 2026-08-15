import React, { useState } from "react";
import { X, Download, Copy, Share2, ZoomIn, ZoomOut, RotateCcw, Check, Sparkles, Layers } from "lucide-react";
import { GeneratedImage, VisualExplanation } from "../types.js";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  generatedImageInfo?: GeneratedImage;
  visualExplanationInfo?: VisualExplanation;
  onRegenerate?: (prompt: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  generatedImageInfo,
  visualExplanationInfo,
  onRegenerate,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const isVisualExplanation = !!visualExplanationInfo;
  const isSvgOrMermaid =
    visualExplanationInfo?.type === "svg" || visualExplanationInfo?.type === "mermaid";
  const activePrompt =
    generatedImageInfo?.prompt ||
    visualExplanationInfo?.titleKm ||
    visualExplanationInfo?.title ||
    "";

  const handleDownload = () => {
    setIsExporting(true);
    try {
      if (imageUrl && !isSvgOrMermaid) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `chat-gpr-visual-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsExporting(false);
        return;
      }

      if (visualExplanationInfo?.data && visualExplanationInfo.type === "svg") {
        const blob = new Blob([visualExplanationInfo.data], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-gpr-visual-explanation-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        return;
      }

      if (imageUrl) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `chat-gpr-visual-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setIsExporting(false);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (imageUrl) {
        await navigator.clipboard.writeText(imageUrl);
      } else if (visualExplanationInfo?.data) {
        await navigator.clipboard.writeText(visualExplanationInfo.data);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "CHAT GPR Visual",
          text: activePrompt,
          url: window.location.href,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
      {/* Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111318]/80 border border-[#242933] backdrop-blur-md">
          {isVisualExplanation ? (
            <Layers className="w-4 h-4 text-[#818CF8]" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#A78BFA]" />
          )}
          <span className="text-xs font-medium text-white font-khmer">
            {visualExplanationInfo
              ? visualExplanationInfo.titleKm || visualExplanationInfo.title
              : generatedImageInfo
              ? "រូបភាពបង្កើតដោយ AI / Generated Image"
              : "រូបភាព / Image Viewer"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#111318]/80 border border-[#242933] rounded-xl p-1 backdrop-blur-md">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-[#CBD5E1]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white rounded-xl bg-[#111318]/80 border border-[#242933] hover:bg-[#242933] transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Visual Stage */}
      <div className="w-full h-full flex items-center justify-center overflow-auto p-4 my-12">
        {visualExplanationInfo?.type === "svg" && visualExplanationInfo.data ? (
          <div
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[82vh] max-w-[90vw] overflow-auto rounded-xl shadow-2xl transition-transform duration-150 ease-out border border-[#242933]/50 [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: visualExplanationInfo.data }}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={activePrompt || "Full size view"}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-xl shadow-2xl transition-transform duration-150 ease-out border border-[#242933]/50"
          />
        ) : null}
      </div>

      {/* Bottom Action Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 max-w-lg w-full px-4">
        {activePrompt && (
          <div className="w-full px-3 py-2 rounded-xl bg-[#111318]/90 border border-[#242933] text-center text-xs text-[#CBD5E1] font-khmer backdrop-blur-md truncate shadow-lg">
            <span className="text-[#818CF8] font-semibold">
              {visualExplanationInfo ? "គំនិត/ប្រធានបទ: " : "Prompt: "}
            </span>
            {activePrompt}
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#111318]/90 border border-[#242933] rounded-2xl p-1.5 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C2028] text-white hover:bg-[#282E3A] text-xs font-semibold font-khmer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#818CF8]" />
            {isExporting ? "កំពុងទាញយក..." : "ទាញយក / Download"}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C2028] text-white hover:bg-[#282E3A] text-xs font-semibold font-khmer transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#A78BFA]" />
            )}
            {copied ? "បានចម្លង!" : "ចម្លង / Copy"}
          </button>

          {onRegenerate && activePrompt && (
            <button
              onClick={() => {
                onRegenerate(activePrompt);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-semibold font-khmer hover:opacity-95 transition-all shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              បង្កើតម្តងទៀត / Regenerate
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-[#1C2028] text-[#94A3B8] hover:text-white hover:bg-[#282E3A] transition-all"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
