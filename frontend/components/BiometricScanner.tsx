import React, { useState } from "react";

interface BiometricScannerProps {
  onScanComplete: () => void;
  disabled?: boolean;
}

export function BiometricScanner({ onScanComplete, disabled }: BiometricScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    if (disabled || scanning) return;
    setScanning(true);
    setScanned(false);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      onScanComplete();
    }, 2000);
  };

  return (
    <button
      onClick={handleScan}
      disabled={disabled || scanning}
      className="flex flex-col items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
    >
      <div className="relative">
        {scanning && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-[#006400] animate-ping opacity-40" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-[#FFD700] animate-ping opacity-20" style={{ animationDelay: "0.3s" }} />
          </>
        )}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
          scanned
            ? "bg-[#006400] shadow-lg shadow-[#006400]/40"
            : scanning
            ? "bg-[#006400]/20 border-2 border-[#006400]"
            : "bg-muted border-2 border-muted-foreground/30 group-hover:border-[#006400] group-hover:bg-[#006400]/10"
        }`}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 4C12.06 4 4 12.06 4 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 8C14.27 8 8 14.27 8 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <path d="M22 12C16.48 12 12 16.48 12 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M22 16C18.69 16 16 18.69 16 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <path d="M22 20C20.9 20 20 20.9 20 22" stroke={scanned ? "white" : "#006400"} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
            <path d="M40 22C40 31.94 31.94 40 22 40" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M36 22C36 29.73 29.73 36 22 36" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <path d="M32 22C32 27.52 27.52 32 22 32" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            <path d="M28 22C28 25.31 25.31 28 22 28" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <path d="M24 22C24 23.1 23.1 24 22 24" stroke={scanned ? "white" : "#FFD700"} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
      </div>
      <span className={`text-sm font-medium transition-colors ${
        scanned ? "text-[#006400]" : "text-muted-foreground group-hover:text-[#006400]"
      }`}>
        {scanned ? "✓ Verified" : scanning ? "Scanning…" : "Scan Fingerprint"}
      </span>
    </button>
  );
}
