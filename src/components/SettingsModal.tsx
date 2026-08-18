import React, { useState } from "react";
import { X, Sliders, Globe, Volume2, Search, Trash2, Check, Sparkles, Zap } from "lucide-react";
import { ChatSettings } from "../types.js";
import { calculateStorageUsage } from "../utils/storage.js";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSaveSettings: (newSettings: ChatSettings) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllConversations,
}) => {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const storageInfo = calculateStorageUsage();

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#111318] border border-[#242933] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E232E] bg-[#171A21]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#818CF8]" />
            <h3 className="font-semibold text-white font-khmer text-sm">
              ការកំណត់ / Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-[#CBD5E1]">
          {/* Web Search Grounding */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171A21] border border-[#242933]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#6366F1]/10 text-[#818CF8] mt-0.5">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs font-khmer">
                  ស្វែងរកព័ត៌មានតាម Web Search Grounding
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 font-khmer">
                  ភ្ជាប់ជាមួយទិន្នន័យ Google Search ពេលសួរព័ត៌មានទាន់ហេតុការណ៍
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  webSearchEnabled: !localSettings.webSearchEnabled,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.webSearchEnabled ? "bg-[#6366F1]" : "bg-[#242933]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.webSearchEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Sound & Audio */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#171A21] border border-[#242933]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#8B5CF6]/10 text-[#A78BFA] mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white text-xs font-khmer">
                  សំឡេងអាន AI (Read Aloud TTS)
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 font-khmer">
                  បើកដំណើរការមុខងារបញ្ចេញសំឡេងអានចម្លើយ
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  soundEnabled: !localSettings.soundEnabled,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.soundEnabled ? "bg-[#6366F1]" : "bg-[#242933]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.soundEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Language Preference */}
          <div className="p-3.5 rounded-xl bg-[#171A21] border border-[#242933] space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white font-khmer">
              <Globe className="w-4 h-4 text-[#818CF8]" />
              <span>ភាសាចម្បង / Preferred Language</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "auto", label: "ស្វ័យប្រវត្តិ (Auto)" },
                { id: "km", label: "ភាសាខ្មែរ (Khmer)" },
                { id: "en", label: "English" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      preferredLanguage: item.id as any,
                    })
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-medium font-khmer border transition-all ${
                    localSettings.preferredLanguage === item.id
                      ? "bg-[#6366F1]/20 border-[#6366F1] text-white"
                      : "bg-[#1C2028] border-[#242933] text-[#94A3B8] hover:border-[#3E4556]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom System Instruction */}
          <div className="p-3.5 rounded-xl bg-[#171A21] border border-[#242933] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white font-khmer">
              <Sparkles className="w-4 h-4 text-[#EC4899]" />
              <span>ការណែនាំបន្ថែមសម្រាប់ AI (Custom Persona)</span>
            </div>
            <textarea
              value={localSettings.customSystemPrompt || ""}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  customSystemPrompt: e.target.value,
                })
              }
              placeholder="ឧទាហរណ៍៖ ឆ្លើយដោយសង្ខេប និងប្រើភាសាផ្លូវការ..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-[#1C2028] border border-[#242933] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-khmer resize-none"
            />
          </div>

          {/* Storage & Clear History */}
          <div className="p-3.5 rounded-xl bg-[#171A21] border border-[#242933] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white font-khmer">
                  ទិន្នន័យប្រវត្តិសន្ទនា (Local Storage)
                </p>
                <p className="text-[11px] text-[#94A3B8] font-khmer mt-0.5">
                  {storageInfo.count} ការសន្ទនា ({storageInfo.usedKb} KB ប្រើប្រាស់)
                </p>
              </div>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 text-xs font-semibold font-khmer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  លុបទាំងអស់ / Clear
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClearAllConversations();
                      setShowClearConfirm(false);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#EF4444] text-white text-[11px] font-semibold font-khmer hover:bg-[#DC2626]"
                  >
                    បញ្ជាក់ / Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#242933] text-[#CBD5E1] text-[11px] font-khmer"
                  >
                    ទេ / Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1E232E] bg-[#171A21] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-white font-khmer transition-colors"
          >
            បោះបង់ / Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-semibold font-khmer shadow-lg shadow-[#6366F1]/30 hover:opacity-95 transition-all"
          >
            <Check className="w-4 h-4" />
            រក្សាទុក / Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
