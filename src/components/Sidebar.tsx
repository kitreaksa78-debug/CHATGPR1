import React, { useState } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit2,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { Conversation } from "../types.js";
import { User } from "../contexts/AuthContext.js";
import { Logo } from "./Logo.js";
import { calculateStorageUsage } from "../utils/storage.js";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAgents?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  onToggleArchive,
  onOpenSettings,
  onOpenAgents,
  user,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const storageUsage = calculateStorageUsage();

  // Filter active conversations
  const filtered = conversations.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch && !c.isArchived;
  });

  const pinnedChats = filtered.filter((c) => c.isPinned);
  const normalChats = filtered.filter((c) => !c.isPinned);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-[#111318] border-r border-[#1E232E] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#1E232E] flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1C2028]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-xs font-khmer shadow-lg shadow-[#6366F1]/20 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ការសន្ទនាថ្មី / New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកការសន្ទនា... / Search..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#171A21] border border-[#242933] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-khmer transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-[#818CF8] font-khmer">
                <Pin className="w-3 h-3" />
                <span>បានខ្ទាស់ / Pinned</span>
              </div>
              {pinnedChats.map((c) => renderChatItem(c))}
            </div>
          )}

          {/* Recent Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#64748B] font-khmer">
              <span>ថ្មីៗ / Recent</span>
              <span className="text-[10px]">{filtered.length}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] font-khmer">
                {searchQuery ? "រកមិនឃើញការសន្ទនាទេ" : "មិនទាន់មានប្រវត្តិសន្ទនាទេ"}
              </div>
            ) : (
              normalChats.map((c) => renderChatItem(c))
            )}
          </div>
        </div>

        {/* User Profile + Settings Footer */}
        <div className="p-3 border-t border-[#1E232E] bg-[#0E1015] space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#171A21] border border-[#242933]">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-[#242933] object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                {user.email && <p className="text-[10px] text-[#64748B] truncate">{user.email}</p>}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex-shrink-0"
                title="ចាកចេញ / Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onOpenAgents}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-white hover:bg-[#171A21] font-khmer transition-colors"
            >
              <span>🤖</span>
              <span>AI Agents</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-white hover:bg-[#171A21] font-khmer transition-colors"
            >
              <Settings className="w-4 h-4 text-[#818CF8]" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  function renderChatItem(conv: Conversation) {
    const isActive = conv.id === activeChatId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          onSelectChat(conv.id);
          if (window.innerWidth < 1024) onClose();
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
          isActive
            ? "bg-[#1C2028] border-[#6366F1]/50 text-white shadow-md shadow-[#6366F1]/10"
            : "bg-[#14171E] hover:bg-[#171A21] border-transparent text-[#CBD5E1] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MessageSquare
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isActive ? "text-[#818CF8]" : "text-[#64748B] group-hover:text-[#94A3B8]"
            }`}
          />

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename(conv.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={() => saveRename(conv.id)}
              className="w-full bg-[#0B0D10] px-2 py-0.5 rounded border border-[#6366F1] text-xs text-white focus:outline-none font-khmer"
            />
          ) : (
            <span className="text-xs font-khmer truncate pr-1">{conv.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(conv.id);
              }}
              className="p-1 text-[#64748B] hover:text-[#818CF8] rounded hover:bg-[#242933]"
              title={conv.isPinned ? "Unpin" : "Pin"}
            >
              {conv.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>

            <button
              onClick={(e) => startRename(conv, e)}
              className="p-1 text-[#64748B] hover:text-white rounded hover:bg-[#242933]"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive(conv.id);
              }}
              className="p-1 text-[#64748B] hover:text-[#A78BFA] rounded hover:bg-[#242933]"
              title={conv.isArchived ? "Unarchive" : "Archive"}
            >
              {conv.isArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(conv.id);
              }}
              className="p-1 text-[#64748B] hover:text-[#EF4444] rounded hover:bg-[#242933]"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
};
