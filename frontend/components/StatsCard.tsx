import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "green" | "gold" | "red" | "blue";
  subtitle?: string;
}

const colorMap = {
  green: {
    bg: "bg-[#006400]/10 dark:bg-[#006400]/20",
    icon: "text-[#006400] dark:text-green-400",
    value: "text-[#006400] dark:text-green-400",
    border: "border-[#006400]/30",
  },
  gold: {
    bg: "bg-[#FFD700]/10 dark:bg-[#FFD700]/20",
    icon: "text-[#B8860B] dark:text-[#FFD700]",
    value: "text-[#B8860B] dark:text-[#FFD700]",
    border: "border-[#FFD700]/30",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    icon: "text-red-600 dark:text-red-400",
    value: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-700",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-700",
  },
};

export function StatsCard({ title, value, icon: Icon, color, subtitle }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`p-3 rounded-full ${c.bg} border ${c.border}`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className={`text-3xl font-bold ${c.value}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
