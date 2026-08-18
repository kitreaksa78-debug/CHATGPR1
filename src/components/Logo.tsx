import React from "react";
import { ChatGprIcon } from "./ChatGprIcon.js";

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
    md: "w-8 h-8",
    lg: "w-14 h-14 sm:w-16 sm:h-16",
    xl: "w-20 h-20 sm:w-24 sm:h-24",
  };

  const textClasses = {
    sm: "text-base tracking-wider",
    md: "text-lg tracking-wider",
    lg: "text-2xl tracking-wider",
    xl: "text-3xl tracking-widest",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Authentic OpenAI Knot Geometry with Signature Neon Gradient */}
      <div className={`flex items-center justify-center flex-shrink-0 ${iconSizeClasses[size]}`}>
        <ChatGprIcon className="w-full h-full" glow={size !== "sm"} />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-white font-sans ${textClasses[size]}`}>
              CHAT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#818CF8] to-[#C084FC]">GPR</span>
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
