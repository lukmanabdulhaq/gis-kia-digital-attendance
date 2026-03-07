import React from "react";

interface GhanaFlagProps {
  height?: number;
  className?: string;
}

export function GhanaFlagBar({ height = 6, className = "" }: GhanaFlagProps) {
  return (
    <div className={`flex w-full ${className}`} style={{ height }}>
      <div className="flex-1 bg-red-600" />
      <div className="flex-1 bg-[#FFD700]" />
      <div className="flex-1 bg-[#006400]" />
    </div>
  );
}
