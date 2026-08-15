import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  Download,
  Share2,
  ZoomIn,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Layers,
  Network,
  Compass,
  CloudSun,
  Cpu,
  GitBranch,
  Activity,
  FileCode,
  Eye,
  Maximize2
} from "lucide-react";
import { VisualExplanation, VisualType } from "../types.js";

// Initialize mermaid with dark mode styling and Khmer font
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "#0F131A",
    primaryColor: "#1E293B",
    primaryTextColor: "#F8FAFC",
    primaryBorderColor: "#6366F1",
    lineColor: "#818CF8",
    secondaryColor: "#1E1B4B",
    tertiaryColor: "#0D1117",
    fontFamily: "'Noto Sans Khmer', 'Plus Jakarta Sans', -apple-system, sans-serif",
    fontSize: "13px",
  },
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "basis",
  },
});

interface VisualExplanationCardProps {
  visual: VisualExplanation;
  onRegenerate?: (visual: VisualExplanation) => void;
  onOpenLightbox?: (visual: VisualExplanation) => void;
}

export const VisualExplanationCard: React.FC<VisualExplanationCardProps> = ({
  visual,
  onRegenerate,
  onOpenLightbox,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedSvg, setRenderedSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Render Mermaid diagrams dynamically
  useEffect(() => {
    let isMounted = true;

    if (visual.type === "mermaid" && visual.data) {
      const renderId = `mermaid_${visual.id}_${Math.random().toString(36).substring(2, 7)}`;
      mermaid
        .render(renderId, visual.data)
        .then(({ svg }) => {
          if (isMounted) {
            setRenderedSvg(svg);
            setRenderError(null);
          }
        })
        .catch((err) => {
          console.warn("[VisualExplanationCard] Mermaid render error:", err);
          if (isMounted) {
            setRenderError("Could not render diagram. Displaying structure.");
          }
        });
    } else if (visual.type === "svg" && visual.data) {
      setRenderedSvg(visual.data);
      setRenderError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [visual.id, visual.type, visual.data]);

  // Export visual as PNG
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (visual.type === "image" && visual.data) {
        const a = document.createElement("a");
        a.href = visual.data;
        a.download = `chat-gpr-visual-explanation-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsExporting(false);
        return;
      }

      // Export SVG / Mermaid as high-resolution PNG
      const svgElement = containerRef.current?.querySelector("svg");
      if (!svgElement) {
        setIsExporting(false);
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const blobURL = window.URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // 2x high DPI
        const width = (svgElement.clientWidth || 800) * scale;
        const height = (svgElement.clientHeight || 480) * scale;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0B0E14";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const dlUrl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = dlUrl;
              a.download = `chat-gpr-visual-explanation-${Date.now()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(dlUrl);
            }
            setIsExporting(false);
          }, "image/png");
        }
        window.URL.revokeObjectURL(blobURL);
      };

      image.onerror = () => {
        // Fallback: download raw SVG
        const a = document.createElement("a");
        a.href = blobURL;
        a.download = `chat-gpr-visual-explanation-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobURL);
        setIsExporting(false);
      };

      image.src = blobURL;
    } catch (e) {
      console.error("Export error:", e);
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      if (visual.type === "mermaid") {
        await navigator.clipboard.writeText(visual.data);
      } else if (renderedSvg) {
        await navigator.clipboard.writeText(renderedSvg);
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
          title: visual.titleKm || visual.title || "CHAT GPR Visual Explanation",
          text: visual.titleKm || visual.title,
          url: window.location.href,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  // Get matching visual icon
  const getVisualIcon = (type?: VisualType) => {
    switch (type) {
      case "architecture":
        return <Network className="w-4 h-4 text-[#818CF8]" />;
      case "geometry":
        return <Compass className="w-4 h-4 text-[#EC4899]" />;
      case "science":
        return <CloudSun className="w-4 h-4 text-[#38BDF8]" />;
      case "concept_map":
        return <Cpu className="w-4 h-4 text-[#A78BFA]" />;
      case "timeline":
        return <GitBranch className="w-4 h-4 text-[#10B981]" />;
      case "process":
      case "flowchart":
        return <Activity className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Layers className="w-4 h-4 text-[#818CF8]" />;
    }
  };

  const getVisualTypeLabel = (type?: VisualType) => {
    switch (type) {
      case "geometry":
        return "គំនូសធរណីមាត្រ / Geometry";
      case "science":
        return "គំនូរវិទ្យាសាស្ត្រ / Science Diagram";
      case "architecture":
        return "ស្ថាបត្យកម្មប្រព័ន្ធ / Architecture";
      case "flowchart":
        return "ដ្យាក្រាមលំហូរ / Flowchart";
      case "timeline":
        return "បន្ទាត់ពេលវេលា / Timeline";
      case "concept_map":
        return "គំនូសគំនិត / Concept Map";
      case "infographic":
        return "Infographic";
      default:
        return "គំនូសតាងពន្យល់ / Visual Diagram";
    }
  };

  return (
    <div
      id={`visual-card-${visual.id}`}
      className="my-3 w-full rounded-2xl bg-[#0D1117]/95 border border-[#242C3D] overflow-hidden shadow-xl transition-all hover:border-[#38435C]"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#131822] border-b border-[#1E2638]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#1E2638] border border-[#2A364E]">
            {getVisualIcon(visual.visualType)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white font-khmer">
                {visual.titleKm || visual.title}
              </span>
              {visual.status === "ready" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-2.5 h-2.5" /> រួចរាល់
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#94A3B8] font-khmer">
              {getVisualTypeLabel(visual.visualType)}
            </span>
          </div>
        </div>

        {/* View Switcher / Fullscreen trigger */}
        <div className="flex items-center gap-1.5">
          {visual.type === "mermaid" && (
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1C2333] hover:bg-[#252F45] text-[#94A3B8] hover:text-white text-xs transition-colors"
              title={showCode ? "Show Diagram" : "View Code"}
            >
              {showCode ? <Eye className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline font-mono text-[11px]">
                {showCode ? "Diagram" : "Code"}
              </span>
            </button>
          )}

          {onOpenLightbox && (
            <button
              onClick={() => onOpenLightbox(visual)}
              className="p-1.5 rounded-lg bg-[#1C2333] hover:bg-[#252F45] text-[#94A3B8] hover:text-white transition-colors"
              title="View Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas Content */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto p-3 sm:p-5 flex items-center justify-center min-h-[220px] bg-[#0A0D14]"
      >
        {visual.status === "generating" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#6366F1]/30 border-t-[#6366F1] animate-spin" />
              <Sparkles className="w-4 h-4 text-[#818CF8] absolute" />
            </div>
            <p className="text-xs text-[#CBD5E1] font-khmer animate-pulse">
              កំពុងរៀបចំរូបភាពពន្យល់... (Preparing visual explanation)
            </p>
          </div>
        ) : showCode && visual.type === "mermaid" ? (
          <pre className="w-full p-4 rounded-xl bg-[#090C10] border border-[#1E293B] text-xs font-mono text-[#A5B4FC] overflow-x-auto whitespace-pre">
            {visual.data}
          </pre>
        ) : visual.type === "image" ? (
          <img
            src={visual.data}
            alt={visual.title}
            className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-md hover:scale-[1.01] transition-transform cursor-pointer"
            onClick={() => onOpenLightbox?.(visual)}
          />
        ) : renderError ? (
          <div className="p-4 text-center">
            <p className="text-xs text-amber-400 mb-2">{renderError}</p>
            <pre className="p-3 rounded-lg bg-[#111827] text-left text-[11px] font-mono text-[#CBD5E1]">
              {visual.data}
            </pre>
          </div>
        ) : (
          <div
            className="w-full flex justify-center items-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:rounded-xl"
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        )}
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#10141E] border-t border-[#1E2638]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2333] hover:bg-[#252F45] text-white text-xs font-medium font-khmer transition-all"
            title="Download visual as PNG image"
          >
            <Download className="w-3.5 h-3.5 text-[#818CF8]" />
            <span>{isExporting ? "កំពុងទាញយក..." : "ទាញយក / Download"}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2333] hover:bg-[#252F45] text-white text-xs font-medium font-khmer transition-all"
            title="Copy diagram markup or code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#A78BFA]" />
            )}
            <span>{copied ? "បានចម្លង!" : "ចម្លង / Copy"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(visual)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2333] hover:bg-[#252F45] text-[#CBD5E1] hover:text-white text-xs font-medium font-khmer transition-all"
              title="Regenerate this visual"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>បង្កើតម្តងទៀត / Regenerate</span>
            </button>
          )}

          {onOpenLightbox && (
            <button
              onClick={() => onOpenLightbox(visual)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white text-xs font-semibold font-khmer shadow-md transition-all"
              title="View Larger"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>មើលធំ / View larger</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-[#1C2333] hover:bg-[#252F45] text-[#94A3B8] hover:text-white transition-all"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
