import React from "react";
import { ChatGprIcon } from "../components/ChatGprIcon.js";

interface WelcomePageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  { icon: "🔍", text: "Web Search", desc: "Real-time internet search" },
  { icon: "🧠", text: "Gemini AI", desc: "Multi-model routing" },
  { icon: "🎨", text: "Image Gen", desc: "AI image creation" },
  { icon: "👁️", text: "Vision", desc: "Image understanding" },
  { icon: "🌐", text: "Multi-Language", desc: "KH · EN · CN · JP" },
  { icon: "🤖", text: "AI Agents", desc: "FB & Telegram bots" },
];

export const WelcomePage: React.FC<WelcomePageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full bg-[#0B0D10] text-white flex flex-col items-center justify-center px-5 sm:px-8 lg:px-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] lg:w-[900px] h-[400px] sm:h-[500px] lg:h-[600px] bg-[#6366F1]/[0.07] rounded-full blur-[150px] sm:blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[25%] left-[40%] w-[300px] sm:w-[400px] lg:w-[500px] h-[300px] sm:h-[400px] lg:h-[500px] bg-[#8B5CF6]/[0.04] rounded-full blur-[120px] sm:blur-[140px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-7 lg:gap-8 max-w-xl lg:max-w-2xl text-center">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#6366F1]/20 rounded-full blur-3xl" />
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-[#111318]/80 border border-[#1E232E] flex items-center justify-center shadow-2xl shadow-[#6366F1]/15">
            <ChatGprIcon className="w-12 h-12 sm:w-16 sm:h-16 lg:w-18 lg:h-18" glow={true} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
          <span className="text-white">CHAT</span>{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] via-[#A78BFA] to-[#C084FC]">
            GPR
          </span>
        </h1>

        {/* Khmer Subtitle */}
        <p className="text-[#94A3B8] text-xs sm:text-sm lg:text-base leading-relaxed font-khmer px-2 sm:px-4">
          ជំនួយការ AI ដែលមាន Web Search និង Grounding សម្រាប់ស្វែងរកព័ត៌មានពី Internet ជាស្វ័យប្រវត្តិ
        </p>

        {/* English Subtitle */}
        <p className="text-[#64748B] text-[11px] sm:text-xs lg:text-sm">
          Your AI assistant with Web Search and Grounding.
        </p>

        {/* Feature Chips - 2 columns on mobile */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3 mt-3 sm:mt-4 w-full max-w-md sm:max-w-lg">
          {FEATURES.map((feat) => (
            <div
              key={feat.text}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#14171E]/80 border border-[#1E232E] text-[11px] sm:text-xs lg:text-sm text-[#CBD5E1] hover:border-[#6366F1]/30 hover:bg-[#1C2028] transition-all duration-200"
            >
              <span className="text-sm sm:text-base">{feat.icon}</span>
              <span className="font-medium">{feat.text}</span>
            </div>
          ))}
        </div>

        {/* Get Started Button */}
        <button
          onClick={onGetStarted}
          className="mt-4 sm:mt-6 px-8 sm:px-10 lg:px-12 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-sm sm:text-base lg:text-lg shadow-xl shadow-[#6366F1]/25 hover:shadow-[#6366F1]/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
        >
          Get Started
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        {/* Footer Text */}
        <p className="text-[#475569] text-[10px] sm:text-xs mt-6 sm:mt-8">
          Powered by Gemini AI • Free Web Search • No API Key Required
        </p>
      </div>
    </div>
  );
};
