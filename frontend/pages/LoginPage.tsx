import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GhanaFlagBar } from "../components/GhanaFlag";
import { BiometricScanner } from "../components/BiometricScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "../hooks/useTheme";
import { Sun, Moon, Loader2, Lock, BadgeCheck } from "lucide-react";
import backend from "~backend/client";

export default function LoginPage() {
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!staffId || !pin) {
      toast({ title: "Missing credentials", description: "Please enter Staff ID and PIN", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const resp = await backend.auth.login({ staffId: staffId.trim().toUpperCase(), pin });
      login(resp.token, resp.user);
      toast({ title: "Welcome!", description: `Logged in as ${resp.user.rank} ${resp.user.fullName}` });
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = () => {
    setStaffId("GIS12345");
    setPin("123456");
    setTimeout(() => {
      handleLogin();
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <GhanaFlagBar height={6} />

      <div className="absolute top-8 right-4">
        <Button variant="ghost" size="icon" onClick={toggle}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header Card */}
          <div className="bg-[#006400] rounded-t-2xl px-8 py-8 text-center text-white shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-[#FFD700] flex items-center justify-center shadow-xl">
                <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="45" fill="#006400" />
                  <path d="M50 10 L70 30 L70 70 L50 90 L30 70 L30 30 Z" fill="#FFD700" opacity="0.3" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#FFD700" strokeWidth="2.5" />
                  <text x="50" y="46" textAnchor="middle" fill="#FFD700" fontSize="16" fontWeight="bold" fontFamily="serif">GIS</text>
                  <text x="50" y="62" textAnchor="middle" fill="white" fontSize="10" fontFamily="serif">KIA</text>
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-wide">Digital Attendance Register</h1>
            <p className="text-[#FFD700] text-sm mt-1 font-medium">Ghana Immigration Service</p>
            <p className="text-white/80 text-xs mt-0.5">Kotoka International Airport</p>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-b-2xl shadow-xl border border-t-0 border-border px-8 py-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="staffId" className="text-sm font-semibold">Staff ID</Label>
                <Input
                  id="staffId"
                  placeholder="e.g. GIS12345"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                  className="h-11 font-mono text-sm tracking-wider"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-semibold">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 font-mono text-lg tracking-[0.5em]"
                  maxLength={6}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#006400] hover:bg-[#005000] text-white font-semibold shadow-md shadow-[#006400]/30"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating…</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" /> Login</>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or use biometric</span>
              </div>
            </div>

            <div className="flex justify-center">
              <BiometricScanner onScanComplete={handleBiometric} disabled={loading} />
            </div>

            <div className="mt-6 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground font-medium">Demo credentials</p>
              <p className="text-xs font-mono text-[#006400] dark:text-green-400 mt-1">
                GIS12345 (Admin) · GIS12346 (Supervisor) · GIS12347 (Officer)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">PIN: 123456 for all accounts</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <BadgeCheck className="w-3 h-3 text-[#006400]" />
              <span>Secure</span>
              <span>•</span>
              <span>Encrypted</span>
              <span>•</span>
              <span>Act 908 Compliant</span>
            </div>
          </div>
        </div>
      </div>

      <GhanaFlagBar height={4} />
      <Toaster />
    </div>
  );
}
