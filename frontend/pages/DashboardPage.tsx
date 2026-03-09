import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { StatsCard } from "../components/StatsCard";
import { AttendanceTable, AttendanceRow } from "../components/AttendanceTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Users, Clock, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, Radio, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POLL_INTERVAL = 30000;

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <p className="text-2xl font-mono font-bold text-[#006400] dark:text-green-400">
        {time.toLocaleTimeString("en-GH")}
      </p>
      <p className="text-sm text-muted-foreground">
        {time.toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

function LiveIndicator({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${active ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
      {active ? "Live" : "Paused"}
    </span>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const client = useBackend(token);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalPresent: 0, totalLate: 0, totalAbsent: 0, totalOfficers: 0, todayPresent: 0, todayLate: 0 });
  const [todayRecord, setTodayRecord] = useState<{ clockIn: Date | null; clockOut: Date | null; status: string } | null>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [musterOpen, setMusterOpen] = useState(false);
  const [musterShift, setMusterShift] = useState("morning");
  const [musterLoading, setMusterLoading] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsResp, todayResp, listResp] = await Promise.all([
        client.attendance.attendanceStats(),
        client.attendance.todayAttendance(),
        client.attendance.listAttendance({}),
      ]);
      setStats(statsResp);
      setTodayRecord(todayResp.record);
      setRecords(
        listResp.records.map((r) => ({
          id: r.id,
          staffId: r.staffId,
          fullName: r.fullName,
          rank: r.rank,
          shift: r.shift,
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          date: (r.date as unknown) instanceof Date ? (r.date as unknown as Date).toISOString().split("T")[0] : String(r.date),
          status: r.status,
        }))
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      if (!silent) toast({ title: "Error loading dashboard", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [client]);

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      fetchData(true).then(() => schedulePoll());
    }, POLL_INTERVAL);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    schedulePoll();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const handleTogglePolling = () => {
    if (polling) {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      setPolling(false);
    } else {
      setPolling(true);
      schedulePoll();
    }
  };

  const handleMuster = async () => {
    setMusterLoading(true);
    try {
      const resp = await client.attendance.muster({ shift: musterShift });
      toast({
        title: "Roll Call Initiated!",
        description: `${resp.notifiedOfficers.length} officers in ${musterShift} shift notified. ${resp.sent} push notifications sent.`,
      });
      setMusterOpen(false);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Muster failed";
      toast({ title: "Muster Failed", description: msg, variant: "destructive" });
    } finally {
      setMusterLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const isSupervisor = user?.role === "supervisor" || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.rank} {user?.fullName?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.shift?.charAt(0).toUpperCase() + (user?.shift?.slice(1) ?? "")} Shift · {user?.staffId}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LiveClock />
          <div className="flex items-center gap-2">
            <LiveIndicator active={polling} />
            <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleTogglePolling} title={polling ? "Pause live updates" : "Resume live updates"}>
              <Wifi className={`w-4 h-4 ${polling ? "text-green-500" : "text-muted-foreground"}`} />
            </Button>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString("en-GH")} · Auto-refreshes every 30s
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today Present" value={stats.todayPresent} icon={CheckCircle} color="green" />
        <StatsCard title="Today Late" value={stats.todayLate} icon={AlertTriangle} color="gold" />
        <StatsCard title="Total Officers" value={stats.totalOfficers} icon={Users} color="blue" />
        <StatsCard title="All Time Present" value={stats.totalPresent} icon={TrendingUp} color="green" subtitle="All records" />
      </div>

      {user?.role === "officer" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#006400]" /> Today's Status
          </h2>
          {todayRecord ? (
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={todayRecord.status === "present" ? "bg-[#006400] text-white" : "bg-[#FFD700] text-black"}>
                  {todayRecord.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clock In</p>
                <p className="font-mono font-semibold text-[#006400] dark:text-green-400">
                  {todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString("en-GH") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clock Out</p>
                <p className="font-mono font-semibold text-[#B8860B] dark:text-[#FFD700]">
                  {todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString("en-GH") : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-muted-foreground">You haven't clocked in today yet.</p>
              <Button className="bg-[#006400] hover:bg-[#005000] text-white" onClick={() => navigate("/clock")}>
                <Clock className="w-4 h-4 mr-2" /> Go to Clock In
              </Button>
            </div>
          )}
        </div>
      )}

      {(isAdmin || isSupervisor) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/admin/users")}
            className="rounded-xl border border-[#006400]/30 bg-[#006400]/5 hover:bg-[#006400]/10 p-4 text-left transition-colors group"
          >
            <Users className="w-6 h-6 text-[#006400] mb-2" />
            <p className="font-semibold text-[#006400]">User Management</p>
            <p className="text-xs text-muted-foreground mt-1">Manage officers and staff accounts</p>
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 hover:bg-[#FFD700]/10 p-4 text-left transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-[#B8860B] mb-2" />
            <p className="font-semibold text-[#B8860B]">Reports & Analytics</p>
            <p className="text-xs text-muted-foreground mt-1">View attendance trends and export data</p>
          </button>
          <button
            onClick={() => setMusterOpen(true)}
            className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-800 dark:hover:bg-red-900/30 p-4 text-left transition-colors"
          >
            <Radio className="w-6 h-6 text-red-600 mb-2" />
            <p className="font-semibold text-red-600">Initiate Roll Call</p>
            <p className="text-xs text-muted-foreground mt-1">Send muster alert to shift officers</p>
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            {isSupervisor ? "Team Attendance" : "My Recent Attendance"}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
            View All Reports
          </Button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[#006400]" />
            </div>
          ) : (
            <AttendanceTable records={records.slice(0, 20)} showOfficer={isSupervisor} />
          )}
        </div>
      </div>

      <Dialog open={musterOpen} onOpenChange={setMusterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-600" /> Initiate Roll Call
            </DialogTitle>
            <DialogDescription>
              Select the shift to alert. Officers will receive a push notification to clock in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Select Shift</p>
              <Select value={musterShift} onValueChange={setMusterShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning Shift</SelectItem>
                  <SelectItem value="afternoon">Afternoon Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                  <SelectItem value="all">All Shifts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                This will immediately send push notifications to all officers in the selected shift.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMusterOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleMuster}
              disabled={musterLoading}
            >
              {musterLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Radio className="w-4 h-4 mr-2" />}
              {musterLoading ? "Sending…" : "Initiate Roll Call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
