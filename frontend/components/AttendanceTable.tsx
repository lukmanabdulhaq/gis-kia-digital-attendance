import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AttendanceRow {
  id: number;
  staffId: string;
  fullName: string;
  rank: string;
  shift: string;
  clockIn: Date | null;
  clockOut: Date | null;
  date: string;
  status: string;
}

interface AttendanceTableProps {
  records: AttendanceRow[];
  showOfficer?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "present")
    return <Badge className="bg-[#006400] text-white hover:bg-[#006400]/80">Present</Badge>;
  if (status === "late")
    return <Badge className="bg-[#FFD700] text-black hover:bg-[#FFD700]/80">Late</Badge>;
  return <Badge variant="destructive">Absent</Badge>;
}

function ShiftBadge({ shift }: { shift: string }) {
  const styles: Record<string, string> = {
    morning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    afternoon: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    night: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[shift] ?? ""}`}>
      {shift}
    </span>
  );
}

function formatTime(dt: Date | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

function calcHours(clockIn: Date | null, clockOut: Date | null): string {
  if (!clockIn || !clockOut) return "—";
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

export function AttendanceTable({ records, showOfficer = true }: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No attendance records found</p>
        <p className="text-sm mt-1">Records will appear here once officers clock in</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Date</TableHead>
            {showOfficer && <TableHead>Staff ID</TableHead>}
            {showOfficer && <TableHead>Name</TableHead>}
            {showOfficer && <TableHead>Rank</TableHead>}
            <TableHead>Shift</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-mono text-sm">{r.date}</TableCell>
              {showOfficer && (
                <TableCell className="font-mono text-xs text-[#006400] dark:text-green-400 font-semibold">
                  {r.staffId}
                </TableCell>
              )}
              {showOfficer && <TableCell className="font-medium">{r.fullName}</TableCell>}
              {showOfficer && <TableCell className="text-sm text-muted-foreground">{r.rank}</TableCell>}
              <TableCell>
                <ShiftBadge shift={r.shift} />
              </TableCell>
              <TableCell className="font-mono text-sm text-[#006400] dark:text-green-400">
                {formatTime(r.clockIn)}
              </TableCell>
              <TableCell className="font-mono text-sm text-[#B8860B] dark:text-[#FFD700]">
                {formatTime(r.clockOut)}
              </TableCell>
              <TableCell className="text-sm">{calcHours(r.clockIn, r.clockOut)}</TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
