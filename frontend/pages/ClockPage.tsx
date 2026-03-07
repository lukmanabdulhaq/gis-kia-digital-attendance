import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { GhanaFlagBar } from "../components/GhanaFlag";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Clock, LogIn, LogOut, CheckCircle, MapPin, RefreshCw, Loader2 } from "lucide-react";

function BigClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center select-none">
      <p className="text-6xl md:text-8xl font-mono font-bold tracking-tight text-[#006400] dark:text-green-400">
        {now.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        {now.toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

export default function ClockPage() {
  const { token, user } = useAuth();
  const client = useBackend(token);
  const { toast } = useToast();

  const [todayRecord, setTodayRecord] = useState<{
    id: number; clockIn: Date | null; clockOut: Date | null; status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"in" | "out" | null>(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await client.attendance.todayAttendance();
      setTodayRecord(resp.record);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleClock = async (action: "in" | "out") => {
    setConfirmAction(null);
    setClocking(true);
    try {
      const resp = await client.attendance.clock({ action });
      toast({
        title: action === "in" ? "✅ Clocked In!" : "👋 Clocked Out!",
        description: resp.message,
      });
      await fetchToday();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to clock";
      toast({ title: "Clock Action Failed", description: msg, variant: "destructive" });
    } finally {
      setClocking(false);
    }
  };

  const hasClockedIn = !!todayRecord?.clockIn;
  const hasClockedOut = !!todayRecord?.clockOut;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Clock In / Out</h1>
        <p className="text-muted-foreground text-sm">{user?.rank} {user?.fullName} · {user?.staffId}</p>
      </div>

      <GhanaFlagBar height={5} className="rounded-full overflow-hidden" />

      <BigClock />

      {/* GPS Status */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[#006400]/10 border border-[#006400]/30 w-fit mx-auto">
        <CheckCircle className="w-4 h-4 text-[#006400]" />
        <MapPin className="w-4 h-4 text-[#006400]" />
        <span className="text-sm font-medium text-[#006400] dark:text-green-400">Airport Zone Verified · KIA Terminal 3</span>
      </div>

      {/* Status Card */}
      <div className="rounded-2xl border border-border bg-card shadow-md p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#006400]" /> Today's Attendance
        </h2>

        {loading ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                !hasClockedIn ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                : todayRecord?.status === "late" ? "bg-[#FFD700]/20 text-[#B8860B]"
                : "bg-[#006400]/10 text-[#006400]"
              }`}>
                {!hasClockedIn ? "Not Started" : todayRecord?.status === "late" ? "Late" : "Present"}
              </span>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Clock In</p>
              <p className="font-mono font-bold text-[#006400] dark:text-green-400 text-sm">
                {todayRecord?.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Clock Out</p>
              <p className="font-mono font-bold text-[#B8860B] dark:text-[#FFD700] text-sm">
                {todayRecord?.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-16 text-base font-bold bg-[#006400] hover:bg-[#005000] text-white shadow-lg shadow-[#006400]/30 disabled:opacity-40"
            disabled={hasClockedIn || loading || clocking}
            onClick={() => setConfirmAction("in")}
          >
            {clocking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogIn className="w-5 h-5 mr-2" />}
            CLOCK IN
          </Button>

          <Button
            size="lg"
            className="h-16 text-base font-bold bg-[#FFD700] hover:bg-[#F0C800] text-black shadow-lg shadow-[#FFD700]/30 disabled:opacity-40"
            disabled={!hasClockedIn || hasClockedOut || loading || clocking}
            onClick={() => setConfirmAction("out")}
          >
            {clocking ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
            CLOCK OUT
          </Button>
        </div>

        {hasClockedIn && !hasClockedOut && (
          <p className="text-center text-xs text-[#006400] dark:text-green-400 mt-3 font-medium">
            ✓ Currently clocked in — remember to clock out at end of shift
          </p>
        )}
        {hasClockedOut && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            ✓ Shift completed for today
          </p>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Clock {confirmAction === "in" ? "In" : "Out"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "in"
                ? `You are about to clock IN at ${new Date().toLocaleTimeString("en-GH")}. This will record your attendance for today.`
                : `You are about to clock OUT at ${new Date().toLocaleTimeString("en-GH")}. This will mark the end of your shift.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction === "in" ? "bg-[#006400] hover:bg-[#005000]" : "bg-[#FFD700] hover:bg-[#F0C800] text-black"}
              onClick={() => confirmAction && handleClock(confirmAction)}
            >
              Confirm Clock {confirmAction === "in" ? "In" : "Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
