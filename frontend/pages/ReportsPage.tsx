import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBackend } from "../hooks/useBackend";
import { AttendanceTable, AttendanceRow } from "../components/AttendanceTable";
import { StatsCard } from "../components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, RefreshCw, CheckCircle, AlertTriangle, Users } from "lucide-react";

export default function ReportsPage() {
  const { token, user } = useAuth();
  const client = useBackend(token);
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [shiftFilter, setShiftFilter] = useState("all");
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [chartData, setChartData] = useState<{ date: string; Present: number; Late: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const isSupervisorOrAdmin = user?.role === "supervisor" || user?.role === "admin";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { startDate, endDate };
      if (shiftFilter !== "all") params.shift = shiftFilter;
      const resp = await client.attendance.listAttendance(params);
      const mapped = resp.records.map((r) => ({
        id: r.id,
        staffId: r.staffId,
        fullName: r.fullName,
        rank: r.rank,
        shift: r.shift,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        date: r.date,
        status: r.status,
      }));
      setRecords(mapped);

      // Build chart data
      const byDate: Record<string, { Present: number; Late: number }> = {};
      for (const r of mapped) {
        if (!byDate[r.date]) byDate[r.date] = { Present: 0, Late: 0 };
        if (r.status === "present") byDate[r.date].Present++;
        if (r.status === "late") byDate[r.date].Late++;
      }
      setChartData(
        Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, counts]) => ({ date: date.slice(5), ...counts }))
      );
    } catch (err) {
      console.error(err);
      toast({ title: "Error loading reports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [client, startDate, endDate, shiftFilter]);

  useEffect(() => { fetchData(); }, []);

  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalLate = records.filter((r) => r.status === "late").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;

  const exportCSV = () => {
    const header = "Date,Staff ID,Full Name,Rank,Shift,Clock In,Clock Out,Status,Hours\n";
    const rows = records.map((r) => {
      const cin = r.clockIn ? new Date(r.clockIn).toLocaleTimeString("en-GH") : "";
      const cout = r.clockOut ? new Date(r.clockOut).toLocaleTimeString("en-GH") : "";
      let hrs = "";
      if (r.clockIn && r.clockOut) {
        const diff = new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime();
        hrs = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
      }
      return `${r.date},${r.staffId},"${r.fullName}",${r.rank},${r.shift},${cin},${cout},${r.status},${hrs}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gis_attendance_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const rows = records.map((r) => {
      const cin = r.clockIn ? new Date(r.clockIn).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }) : "—";
      const cout = r.clockOut ? new Date(r.clockOut).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }) : "—";
      let hrs = "—";
      if (r.clockIn && r.clockOut) {
        const diff = new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime();
        hrs = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
      }
      return `<tr>
        <td>${r.date}</td><td>${r.staffId}</td><td>${r.fullName}</td>
        <td>${r.rank}</td><td style="text-transform:capitalize">${r.shift}</td>
        <td>${cin}</td><td>${cout}</td><td>${hrs}</td>
        <td><span style="color:${r.status === "present" ? "#006400" : r.status === "late" ? "#B8860B" : "#dc2626"};font-weight:600;text-transform:capitalize">${r.status}</span></td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><title>GIS KIA Attendance Report</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#111}
    h1{color:#006400;font-size:16px;margin:0}h2{font-size:12px;margin:4px 0 2px}
    .meta{font-size:10px;color:#555;margin-bottom:12px}
    .stats{display:flex;gap:24px;margin-bottom:16px;font-size:11px}
    .stat{padding:8px 16px;border-radius:6px;background:#f3f4f6;text-align:center}
    .stat-val{font-size:18px;font-weight:700;color:#006400}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#006400;color:#fff;padding:5px 6px;text-align:left}
    td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even){background:#f9fafb}
    .footer{margin-top:20px;font-size:9px;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:8px}
    @media print{button{display:none}}</style></head><body>
    <h1>Ghana Immigration Service</h1>
    <h2>Kotoka International Airport — Attendance Report</h2>
    <div class="meta">Period: ${startDate} to ${endDate} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString("en-GH")}</div>
    <div class="stats">
      <div class="stat"><div class="stat-val">${records.length}</div>Total</div>
      <div class="stat"><div class="stat-val" style="color:#006400">${totalPresent}</div>Present</div>
      <div class="stat"><div class="stat-val" style="color:#B8860B">${totalLate}</div>Late</div>
      <div class="stat"><div class="stat-val" style="color:#dc2626">${totalAbsent}</div>Absent</div>
    </div>
    <table><thead><tr><th>Date</th><th>Staff ID</th><th>Name</th><th>Rank</th><th>Shift</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">Ghana Immigration Service | KIA Digital Attendance System | Act 908 Compliant | Secure • Encrypted</div>
    <script>window.onload=()=>{window.print();}</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Attendance Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={records.length === 0}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={records.length === 0}>
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          {isSupervisorOrAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs">Shift</Label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="bg-[#006400] hover:bg-[#005000] text-white" onClick={fetchData} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Apply
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Records" value={records.length} icon={Users} color="blue" />
        <StatsCard title="Present" value={totalPresent} icon={CheckCircle} color="green" />
        <StatsCard title="Late" value={totalLate} icon={AlertTriangle} color="gold" />
        <StatsCard title="Absent" value={totalAbsent} icon={AlertTriangle} color="red" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-4">Attendance by Date</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                formatter={(val, name) => [`${val}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Present" fill="#006400" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Late" fill="#FFD700" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Attendance Records</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{records.length} records found</p>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[#006400]" />
            </div>
          ) : (
            <AttendanceTable records={records} showOfficer={isSupervisorOrAdmin} />
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
}
