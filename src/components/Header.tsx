import React, { useState } from "react";
import {
  Menu,
  SquarePen,
  Download,
  Trash2,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Conversation } from "../types.js";
import { User } from "../contexts/AuthContext.js";
import { Logo } from "./Logo.js";
import { exportAsMarkdown, exportAsJson, exportAsText } from "../utils/export.js";

interface HeaderProps {
  onToggleSidebar: () => void;
  currentConversation: Conversation | null;
  webSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
  isTemporary?: boolean;
  onToggleTemporary?: () => void;
  onNewChat: () => void;
  onClearCurrentChat?: () => void;
  onOpenSettings?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentConversation,
  isTemporary,
  onNewChat,
  onClearCurrentChat,
  user,
  onLogout,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#0E1015] border-b border-[#1E232E] flex items-center justify-between flex-shrink-0 z-30">
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center">
          <Logo size="sm" showText={false} />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm sm:text-base text-white font-khmer truncate max-w-[160px] sm:max-w-xs">
            {currentConversation?.title || "CHAT GPR"}
          </span>

          {isTemporary && (
            <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#FBBF24] text-[10px] font-semibold font-khmer">
              បណ្តោះអាសន្ន
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {currentConversation && currentConversation.messages.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#171A21] border border-[#242933] shadow-2xl py-1 z-40 text-xs text-[#CBD5E1] font-khmer animate-fadeIn">
                  <button onClick={() => { exportAsMarkdown(currentConversation); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors">
                    Markdown (.md)
                  </button>
                  <button onClick={() => { exportAsJson(currentConversation); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors">
                    JSON (.json)
                  </button>
                  <button onClick={() => { exportAsText(currentConversation); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-[#242933] hover:text-white transition-colors">
                    Plain Text (.txt)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {currentConversation && currentConversation.messages.length > 0 && onClearCurrentChat && (
          <button
            onClick={onClearCurrentChat}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1C2028] transition-colors"
            title="Clear Messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onNewChat}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1C2028] transition-colors"
          title="New Chat"
        >
          <SquarePen className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {user && (
          <div className="relative ml-1">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#1C2028] transition-colors"
              title={user.name}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-[#242933] object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#171A21] border border-[#242933] shadow-2xl z-40 animate-fadeIn overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#242933]">
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-[#242933] object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        {user.email && <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ចាកចេញ / Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
