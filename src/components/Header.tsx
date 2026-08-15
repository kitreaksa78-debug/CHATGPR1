import React, { useState } from "react";
import {
  Menu,
  Sparkles,
  Globe,
  EyeOff,
  Download,
  Trash2,
  Settings,
  Plus,
  Share2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Conversation } from "../types.js";
import { Logo } from "./Logo.js";
import { exportAsMarkdown, exportAsJson, exportAsText } from "../utils/export.js";

interface HeaderProps {
  onToggleSidebar: () => void;
  currentConversation: Conversation | null;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  isTemporary: boolean;
  onToggleTemporary: () => void;
  onNewChat: () => void;
  onClearCurrentChat: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentConversation,
  webSearchEnabled,
  onToggleWebSearch,
  isTemporary,
  onToggleTemporary,
  onNewChat,
  onClearCurrentChat,
  onOpenSettings,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "CHAT GPR - Multimodal AI Assistant",
          text: "Intelligent AI assistant supporting Khmer, Vision AI, image generation & problem solving.",
          url: window.location.href,
        });
      } catch (e) {
        console.log("Share cancelled", e);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#0E1015] border-b border-[#1E232E] flex items-center justify-between flex-shrink-0 z-30">
      {/* Left section: Sidebar toggle & Title / Logo */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Logo size="sm" showText={false} />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm sm:text-base text-white font-khmer truncate max-w-[140px] sm:max-w-xs">
            {currentConversation?.title || "CHAT GPR"}
          </span>

          {isTemporary && (
            <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-[10px] font-semibold font-khmer">
              សន្ទនាបណ្តោះអាសន្ន
            </span>
          )}
        </div>
      </div>

      {/* Center / Model Badge */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#171A21] border border-[#242933] text-xs">
        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-[#818CF8] font-semibold font-mono">Gemini 3.7 Flash</span>
        <span className="text-[#64748B] text-[10px]">Multimodal</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Web Search Toggle */}
        <button
          onClick={onToggleWebSearch}
          className={`p-2 rounded-xl transition-colors ${
            webSearchEnabled
              ? "bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]"
              : "text-[#94A3B8] hover:text-white hover:bg-[#1C2028]"
          }`}
          title={webSearchEnabled ? "Web Search: Enabled" : "Web Search: Disabled"}
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Temporary / Incognito Chat */}
        <button
          onClick={onToggleTemporary}
          className={`p-2 rounded-xl transition-colors ${
            isTemporary
              ? "bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]"
              : "text-[#94A3B8] hover:text-white hover:bg-[#1C2028]"
          }`}
          title={isTemporary ? "Exit Temporary Chat" : "Start Temporary Chat (No history saved)"}
        >
          <EyeOff className="w-4 h-4" />
        </button>

        {/* Export Dropdown */}
        {currentConversation && currentConversation.messages.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
              title="Export Conversation"
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#171A21] border border-[#242933] shadow-2xl py-1 z-40 text-xs text-[#CBD5E1] font-khmer animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] text-[#64748B] font-semibold border-b border-[#242933]">
                    នាំចេញការសន្ទនា / Export Chat
                  </div>
                  <button
                    onClick={() => {
                      exportAsMarkdown(currentConversation);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => {
                      exportAsJson(currentConversation);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors"
                  >
                    JSON File (.json)
                  </button>
                  <button
                    onClick={() => {
                      exportAsText(currentConversation);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors"
                  >
                    Plain Text (.txt)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Clear Current Chat */}
        {currentConversation && currentConversation.messages.length > 0 && (
          <button
            onClick={onClearCurrentChat}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1C2028] transition-colors"
            title="Clear Messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Share App Link */}
        <button
          onClick={handleShareApp}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
          title="Share CHAT GPR"
        >
          {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
