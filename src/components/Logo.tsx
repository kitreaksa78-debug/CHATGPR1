import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const iconSizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textClasses = {
    sm: "text-base tracking-wider",
    md: "text-lg tracking-wider",
    lg: "text-2xl tracking-wider",
    xl: "text-3xl tracking-widest",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#EC4899] p-0.5 shadow-lg shadow-[#6366F1]/20 ${iconSizeClasses[size]}`}>
        <div className="w-full h-full bg-[#0B0D10] rounded-[10px] flex items-center justify-center relative overflow-hidden group">
          {/* Subtle glowing ambient mesh */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#6366F1]/30 via-transparent to-[#8B5CF6]/40 opacity-70 group-hover:opacity-100 transition-opacity" />
          
          {/* Original Prism Hexagram Shape */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5/6 h-5/6 relative z-10 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
          >
            <path
              d="M16 3L27 9.5V22.5L16 29L5 22.5V9.5L16 3Z"
              stroke="url(#gpr-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3V16M27 22.5L16 16M5 22.5L16 16"
              stroke="url(#gpr-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="3.5" fill="#8B5CF6" className="animate-pulse" />
            <circle cx="16" cy="16" r="1.5" fill="#F8FAFC" />
            <defs>
              <linearGradient id="gpr-gradient" x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#A855F7" />
                <stop offset="1" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-white font-sans ${textClasses[size]}`}>
              CHAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] via-[#A78BFA] to-[#F472B6]">GPR</span>
            </span>
          </div>
          <span className="text-[9px] font-semibold tracking-wider text-[#94A3B8] uppercase font-khmer mt-0.5">
            បញ្ញាសិប្បនិម្មិត AI
          </span>
        </div>
      )}
    </div>
  );
};
