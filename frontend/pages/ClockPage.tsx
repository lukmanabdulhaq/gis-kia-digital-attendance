import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { BiometricRegister } from "../components/BiometricScanner";
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
import { Clock, LogIn, LogOut, CheckCircle, MapPin, RefreshCw, Loader2, Fingerprint, WifiOff, Wifi } from "lucide-react";

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

interface GeofenceStatus {
  checking: boolean;
  allowed: boolean | null;
  latitude?: number;
  longitude?: number;
  distance?: number;
  error?: string;
}

const KIA_LAT = 5.6052;
const KIA_LNG = -0.1719;
const GEOFENCE_RADIUS_KM = 2.0;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [geofence, setGeofence] = useState<GeofenceStatus>({ checking: false, allowed: null });
  const [showRegister, setShowRegister] = useState(false);

  const checkGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeofence({ checking: false, allowed: null, error: "GPS not supported" });
      return;
    }
    setGeofence({ checking: true, allowed: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = haversineKm(latitude, longitude, KIA_LAT, KIA_LNG);
        const allowed = dist <= GEOFENCE_RADIUS_KM;
        setGeofence({ checking: false, allowed, latitude, longitude, distance: dist });
      },
      (err) => {
        setGeofence({ checking: false, allowed: null, error: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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

  useEffect(() => {
    fetchToday();
    checkGeolocation();
  }, [fetchToday, checkGeolocation]);

  const handleClock = async (action: "in" | "out") => {
    setConfirmAction(null);
    setClocking(true);
    try {
      const payload: {
        action: "in" | "out";
        latitude?: number;
        longitude?: number;
      } = { action };
      if (geofence.latitude !== undefined) payload.latitude = geofence.latitude;
      if (geofence.longitude !== undefined) payload.longitude = geofence.longitude;

      const resp = await client.attendance.clock(payload);
      toast({
        title: action === "in" ? "Clocked In!" : "Clocked Out!",
        description: resp.message + (resp.geofenceVerified ? " ✓ Location verified." : ""),
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

  const geofenceIcon = geofence.checking
    ? <RefreshCw className="w-4 h-4 text-[#006400] animate-spin" />
    : geofence.allowed === true
    ? <CheckCircle className="w-4 h-4 text-[#006400]" />
    : geofence.allowed === false
    ? <WifiOff className="w-4 h-4 text-red-500" />
    : <MapPin className="w-4 h-4 text-[#006400]" />;

  const geofenceLabel = geofence.checking
    ? "Checking location…"
    : geofence.allowed === true
    ? `KIA Zone Verified · ${geofence.distance?.toFixed(1)}km from terminal`
    : geofence.allowed === false
    ? `Outside KIA zone · ${geofence.distance?.toFixed(1)}km away (IP auth applies)`
    : geofence.error
    ? "GPS unavailable — IP-based verification active"
    : "KIA Terminal 3";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">Clock In / Out</h1>
        <p className="text-muted-foreground text-sm">{user?.rank} {user?.fullName} · {user?.staffId}</p>
      </div>

      <GhanaFlagBar height={5} className="rounded-full overflow-hidden" />
      <BigClock />

      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[#006400]/10 border border-[#006400]/30 w-fit mx-auto">
        {geofenceIcon}
        <span className="text-sm font-medium text-[#006400] dark:text-green-400">{geofenceLabel}</span>
        <button
          onClick={checkGeolocation}
          className="ml-1 text-[#006400] hover:text-[#005000]"
          title="Refresh GPS"
        >
          <Wifi className="w-3.5 h-3.5" />
        </button>
      </div>

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

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#006400]" /> Biometric Authentication
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Register your fingerprint or face for faster login</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowRegister((v) => !v)}>
            {showRegister ? "Cancel" : "Register"}
          </Button>
        </div>
        {showRegister && token && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
            <BiometricRegister
              token={token}
              staffId={user?.staffId ?? ""}
              onSuccess={() => {
                setShowRegister(false);
                toast({ title: "Biometric Registered!", description: "You can now login using fingerprint/face." });
              }}
            />
          </div>
        )}
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Clock {confirmAction === "in" ? "In" : "Out"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "in"
                ? `You are about to clock IN at ${new Date().toLocaleTimeString("en-GH")}. Location: ${geofenceLabel}.`
                : `You are about to clock OUT at ${new Date().toLocaleTimeString("en-GH")}. This marks the end of your shift.`}
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
