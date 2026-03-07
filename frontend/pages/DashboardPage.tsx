import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { StatsCard } from "../components/StatsCard";
import { AttendanceTable, AttendanceRow } from "../components/AttendanceTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Users, Clock, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export default function DashboardPage() {
  const { token, user } = useAuth();
  const client = useBackend(token);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ totalPresent: 0, totalLate: 0, totalAbsent: 0, totalOfficers: 0, todayPresent: 0, todayLate: 0 });
  const [todayRecord, setTodayRecord] = useState<{ clockIn: Date | null; clockOut: Date | null; status: string } | null>(null);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
          date: r.date,
          status: r.status,
        }))
      );
    } catch (err) {
      console.error(err);
      toast({ title: "Error loading dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <div className="flex items-center gap-3">
          <LiveClock />
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today Present" value={stats.todayPresent} icon={CheckCircle} color="green" />
        <StatsCard title="Today Late" value={stats.todayLate} icon={AlertTriangle} color="gold" />
        <StatsCard title="Total Officers" value={stats.totalOfficers} icon={Users} color="blue" />
        <StatsCard title="All Time Present" value={stats.totalPresent} icon={TrendingUp} color="green" subtitle="All records" />
      </div>

      {/* Officer: Personal Status */}
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
              <Button
                className="bg-[#006400] hover:bg-[#005000] text-white"
                onClick={() => navigate("/clock")}
              >
                <Clock className="w-4 h-4 mr-2" /> Go to Clock In
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Admin: Quick Links */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      )}

      {/* Attendance Table */}
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

      <Toaster />
    </div>
  );
}
