import React from "react";
import { ChatGprIcon } from "../components/ChatGprIcon.js";

interface WelcomePageProps {
  onGetStarted: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0D10] text-white px-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#6366F1]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#8B5CF6]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg text-center animate-fadeIn">
        <div className="relative">
          <div className="absolute inset-0 bg-[#6366F1]/20 rounded-full blur-2xl" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#171A21] border border-[#242933] flex items-center justify-center shadow-2xl shadow-[#6366F1]/20">
            <ChatGprIcon className="w-12 h-12 sm:w-14 sm:h-14" glow={true} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            CHAT{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#818CF8] to-[#C084FC]">
              GPR
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#94A3B8] font-khmer leading-relaxed">
            ជំនួយការ AI ដែលមាន Web Search និង Grounding សម្រាប់ស្វែងរកព័ត៌មានពី Internet ជាស្វ័យប្រវត្តិ។
          </p>
          <p className="text-sm text-[#64748B]">
            Your AI assistant with Web Search and Grounding.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {[
            { icon: "🔍", text: "Web Search" },
            { icon: "🧠", text: "Gemini AI" },
            { icon: "🎨", text: "Image Gen" },
            { icon: "👁️", text: "Vision" },
          ].map((feat) => (
            <div
              key={feat.text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171A21] border border-[#242933] text-xs text-[#94A3B8]"
            >
              <span>{feat.icon}</span>
              <span>{feat.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          className="mt-4 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-sm sm:text-base shadow-lg shadow-[#6366F1]/30 hover:opacity-90 active:scale-95 transition-all"
        >
          Get Started →
        </button>

        <p className="text-xs text-[#475569] mt-4">
          Powered by Gemini AI • Free Web Search • No API Key Required
        </p>
      </div>
    </div>
  );
};
