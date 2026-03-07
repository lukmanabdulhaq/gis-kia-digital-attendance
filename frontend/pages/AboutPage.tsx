import React from "react";
import { GhanaFlagBar } from "../components/GhanaFlag";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, Cpu, GraduationCap, MapPin, CheckCircle } from "lucide-react";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Shield; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
      <h2 className="text-lg font-bold flex items-center gap-2 text-[#006400] dark:text-green-400 mb-4">
        <Icon className="w-5 h-5" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function AboutPage() {
  const techStack = [
    { cat: "Backend", items: ["Encore.ts", "PostgreSQL", "TypeScript"] },
    { cat: "Frontend", items: ["React 18", "Vite", "Tailwind CSS v4", "shadcn/ui"] },
    { cat: "Charting", items: ["Recharts"] },
    { cat: "Export", items: ["jsPDF", "CSV Export"] },
    { cat: "Auth", items: ["Encore.ts Auth Handler", "Staff ID + PIN"] },
    { cat: "Hosting", items: ["Leap (Encore Cloud)"] },
  ];

  const objectives = [
    "Digitize and streamline attendance recording for GIS officers at KIA",
    "Eliminate manual paper-based attendance registers",
    "Provide real-time visibility of officer attendance to supervisors",
    "Generate accurate reports for payroll and performance reviews",
    "Ensure Act 908 compliance with audit trails and system logs",
    "Support biometric integration for enhanced security",
    "Enable shift-based attendance management (Morning, Afternoon, Night)",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-[#006400] px-8 py-10 text-white text-center">
          <div className="flex justify-center mb-5">
            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-[#FFD700] flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#006400" />
                <path d="M50 10 L70 30 L70 70 L50 90 L30 70 L30 30 Z" fill="#FFD700" opacity="0.3" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#FFD700" strokeWidth="2.5" />
                <text x="50" y="46" textAnchor="middle" fill="#FFD700" fontSize="16" fontWeight="bold" fontFamily="serif">GIS</text>
                <text x="50" y="62" textAnchor="middle" fill="white" fontSize="10" fontFamily="serif">KIA</text>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-wide">Digital Attendance Register</h1>
          <p className="text-[#FFD700] font-semibold mt-1">Ghana Immigration Service</p>
          <p className="text-white/80 text-sm mt-0.5 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Kotoka International Airport, Accra, Ghana
          </p>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">Act 908 Compliant</Badge>
            <Badge className="bg-white/10 text-white border-white/20">Shift-Based</Badge>
            <Badge className="bg-white/10 text-white border-white/20">Real-Time</Badge>
          </div>
        </div>
        <GhanaFlagBar height={6} />
      </div>

      {/* Problem Statement */}
      <Section title="Problem Statement" icon={Shield}>
        <p className="text-muted-foreground leading-relaxed">
          The Ghana Immigration Service at Kotoka International Airport historically relied on manual, paper-based attendance registers to track officer punctuality and shift compliance. This approach was prone to errors, difficult to audit, and unable to provide real-time visibility to supervisors. The absence of a centralized system made payroll processing, performance reviews, and regulatory compliance under the Immigration Service Act 908 unnecessarily burdensome.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Officers working across three shifts — Morning, Afternoon, and Night — required a robust system that could handle shift-based late detection, historical reporting, and role-based access control, all while being accessible from any device within the airport premises.
        </p>
      </Section>

      {/* Objectives */}
      <Section title="Project Objectives" icon={Target}>
        <ul className="space-y-2">
          {objectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#006400] flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-sm">{obj}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Technology Stack */}
      <Section title="Technology Stack" icon={Cpu}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {techStack.map(({ cat, items }) => (
            <div key={cat} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-bold text-[#006400] dark:text-green-400 uppercase tracking-wide mb-2">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {items.map((item) => (
                  <span key={item} className="text-xs bg-background border border-border px-2 py-0.5 rounded-full text-muted-foreground">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Credits */}
      <Section title="Project Credits" icon={GraduationCap}>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#006400]/5 border border-[#006400]/20">
            <p className="font-bold text-[#006400] dark:text-green-400">Project Lead Developer</p>
            <p className="text-lg font-semibold mt-1">Bismark Gabriel Dzah</p>
            <p className="text-sm text-muted-foreground">BSc Information Technology</p>
            <p className="text-xs text-muted-foreground mt-1">Staff ID: GIS12345 · Chief Inspector · Ghana Immigration Service</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-1">Institution</p>
              <p className="text-muted-foreground">Ghana Immigration Service</p>
              <p className="text-muted-foreground">Kotoka International Airport</p>
              <p className="text-muted-foreground">Terminal 3, Accra, Ghana</p>
            </div>
            <div>
              <p className="font-semibold mb-1">System Details</p>
              <p className="text-muted-foreground">Version: 1.0.0</p>
              <p className="text-muted-foreground">Regulatory Framework: Act 908</p>
              <p className="text-muted-foreground">Deployment: Leap Cloud Platform</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="text-center text-xs text-muted-foreground pb-4">
        © {new Date().getFullYear()} Ghana Immigration Service · All Rights Reserved · Act 908 Compliant
      </div>
    </div>
  );
}
