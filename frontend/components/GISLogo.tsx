import React from "react";

interface GISLogoProps {
  size?: number;
  showText?: boolean;
}

export function GISLogo({ size = 48, showText = true }: GISLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#006400" stroke="#FFD700" strokeWidth="3" />
        <path d="M50 15 L65 30 L65 70 L50 85 L35 70 L35 30 Z" fill="#FFD700" opacity="0.3" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#FFD700" strokeWidth="2" />
        <text x="50" y="45" textAnchor="middle" fill="#FFD700" fontSize="14" fontWeight="bold" fontFamily="serif">GIS</text>
        <text x="50" y="60" textAnchor="middle" fill="white" fontSize="9" fontFamily="serif">KIA</text>
        <path d="M30 72 Q50 80 70 72" stroke="#FFD700" strokeWidth="1.5" fill="none" />
        <path d="M30 28 Q50 20 70 28" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      </svg>
      {showText && (
        <div>
          <div className="text-xs font-bold text-[#006400] dark:text-[#FFD700] leading-tight">Ghana Immigration</div>
          <div className="text-xs text-[#006400] dark:text-[#FFD700] leading-tight opacity-80">Service · KIA</div>
        </div>
      )}
    </div>
  );
}
