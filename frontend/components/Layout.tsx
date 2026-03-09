import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { GhanaFlagBar } from "./GhanaFlag";
import { GISLogo } from "./GISLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Clock,
  FileBarChart,
  Users,
  ScrollText,
  Info,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
} from "lucide-react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["officer", "supervisor", "admin"] },
  { to: "/clock", label: "Clock In/Out", icon: Clock, roles: ["officer", "supervisor", "admin"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["officer", "supervisor", "admin"] },
  { to: "/admin/users", label: "User Management", icon: Users, roles: ["admin"] },
  { to: "/admin/logs", label: "System Logs", icon: ScrollText, roles: ["admin"] },
  { to: "/about", label: "About", icon: Info, roles: ["officer", "supervisor", "admin"] },
];

const roleBadgeStyle: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  supervisor: "bg-[#FFD700]/20 text-[#B8860B] dark:text-[#FFD700]",
  officer: "bg-[#006400]/10 text-[#006400] dark:bg-green-900/30 dark:text-green-300",
};

export function Layout() {
  const { user, token, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  usePushNotifications(token);

  const visibleLinks = navLinks.filter((l) => user && l.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col bg-card border-r border-border shadow-xl transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-4 border-b border-border">
          <GISLogo size={40} showText={true} />
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#006400] text-white shadow-md shadow-[#006400]/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-[#006400] flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.staffId}</p>
            </div>
          </div>
          <span className={`inline-block w-full text-center text-xs font-medium px-2 py-1 rounded-full capitalize ${roleBadgeStyle[user?.role ?? "officer"]}`}>
            {user?.role}
          </span>
        </div>

        <div className="px-3 pb-4 text-center">
          <p className="text-[9px] text-muted-foreground leading-tight">
            Ghana Immigration Service | KIA<br />
            Digital Attendance System<br />
            Act 908 Compliant
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GhanaFlagBar height={4} />

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-[#006400] dark:text-green-400">
                KIA Digital Attendance Register
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user?.rank}</span>
              <span className="font-medium text-sm">{user?.fullName}</span>
              <Badge className={`capitalize text-xs ${roleBadgeStyle[user?.role ?? "officer"]}`} variant="outline">
                {user?.role}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
