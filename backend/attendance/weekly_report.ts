import { CronJob } from "encore.dev/cron";
import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";
import * as nodemailer from "nodemailer";

const GmailUser = secret("GmailUser");
const GmailPass = secret("GmailPass");
const CommanderEmail = secret("CommanderEmail");

interface WeeklyStats {
  totalOfficers: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  attendanceRate: number;
  lateRate: number;
  byShift: { shift: string; present: number; late: number; total: number }[];
  topAbsentees: { fullName: string; staffId: string; absences: number }[];
}

async function getWeeklyStats(): Promise<WeeklyStats> {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const start = startOfWeek.toISOString().split("T")[0];
  const end = new Date().toISOString().split("T")[0];

  const [officers, attendance, byShift, absentees] = await Promise.all([
    db.rawQueryAll<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE role = 'officer'"),
    db.rawQueryAll<{ status: string; count: string }>(
      "SELECT status, COUNT(*) as count FROM attendance WHERE date >= $1::date AND date <= $2::date GROUP BY status",
      start, end
    ),
    db.rawQueryAll<{ shift: string; status: string; count: string }>(
      `SELECT u.shift, a.status, COUNT(*) as count FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.date >= $1::date AND a.date <= $2::date
       GROUP BY u.shift, a.status ORDER BY u.shift`,
      start, end
    ),
    db.rawQueryAll<{ full_name: string; staff_id: string; absences: string }>(
      `SELECT u.full_name, u.staff_id, COUNT(*) as absences
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id AND a.date >= $1::date AND a.date <= $2::date
       WHERE u.role = 'officer' AND a.id IS NULL
       GROUP BY u.id, u.full_name, u.staff_id
       HAVING COUNT(*) > 0
       ORDER BY absences DESC LIMIT 5`,
      start, end
    ),
  ]);

  const totalOfficers = parseInt(officers[0]?.count ?? "0");
  const presentCount = parseInt(attendance.find((r) => r.status === "present")?.count ?? "0");
  const lateCount = parseInt(attendance.find((r) => r.status === "late")?.count ?? "0");
  const totalRecords = presentCount + lateCount;
  const workingDays = 5;
  const expectedRecords = totalOfficers * workingDays;
  const totalAbsent = Math.max(0, expectedRecords - totalRecords);

  // Group by shift
  const shiftMap: Record<string, { present: number; late: number }> = {};
  for (const r of byShift) {
    if (!shiftMap[r.shift]) shiftMap[r.shift] = { present: 0, late: 0 };
    if (r.status === "present") shiftMap[r.shift].present = parseInt(r.count);
    if (r.status === "late") shiftMap[r.shift].late = parseInt(r.count);
  }
  const shiftStats = Object.entries(shiftMap).map(([shift, v]) => ({
    shift: shift.charAt(0).toUpperCase() + shift.slice(1),
    present: v.present,
    late: v.late,
    total: v.present + v.late,
  }));

  return {
    totalOfficers,
    totalPresent: presentCount,
    totalLate: lateCount,
    totalAbsent,
    attendanceRate: expectedRecords > 0 ? Math.round((totalRecords / expectedRecords) * 100) : 0,
    lateRate: totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0,
    byShift: shiftStats,
    topAbsentees: absentees.map((a) => ({
      fullName: a.full_name,
      staffId: a.staff_id,
      absences: parseInt(a.absences),
    })),
  };
}

function buildEmailHTML(stats: WeeklyStats, weekStart: string, weekEnd: string): string {
  const shiftRows = stats.byShift
    .map((s) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.shift}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#006400;font-weight:bold">${s.present}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#B8860B;font-weight:bold">${s.late}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.total}</td></tr>`)
    .join("");

  const absentRows = stats.topAbsentees.length
    ? stats.topAbsentees.map((a) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${a.fullName}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${a.staffId}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:bold">${a.absences}</td></tr>`).join("")
    : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#6b7280">No absences recorded this week 🎉</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#006400;padding:24px;text-align:center">
    <h1 style="color:white;margin:0;font-size:20px">🇬🇭 GIS-KIA Weekly Attendance Report</h1>
    <p style="color:#86efac;margin:8px 0 0;font-size:14px">${weekStart} — ${weekEnd}</p>
  </div>
  <div style="padding:24px">
    <h2 style="color:#111827;margin:0 0 16px;font-size:16px">Weekly Summary</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:bold;color:#006400">${stats.attendanceRate}%</div><div style="font-size:12px;color:#6b7280;margin-top:4px">Attendance Rate</div></div>
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:bold;color:#B8860B">${stats.lateRate}%</div><div style="font-size:12px;color:#6b7280;margin-top:4px">Late Rate</div></div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:bold;color:#006400">${stats.totalPresent}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">Total Present</div></div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:bold;color:#dc2626">${stats.totalAbsent}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">Estimated Absences</div></div>
    </div>
    <h2 style="color:#111827;margin:0 0 12px;font-size:16px">By Shift</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
      <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left;color:#6b7280">Shift</th><th style="padding:8px 12px;text-align:left;color:#006400">Present</th><th style="padding:8px 12px;text-align:left;color:#B8860B">Late</th><th style="padding:8px 12px;text-align:left;color:#6b7280">Total</th></tr></thead>
      <tbody>${shiftRows}</tbody>
    </table>
    <h2 style="color:#111827;margin:0 0 12px;font-size:16px">Officers Needing Attention</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left;color:#6b7280">Name</th><th style="padding:8px 12px;text-align:left;color:#6b7280">Staff ID</th><th style="padding:8px 12px;text-align:left;color:#dc2626">Absences</th></tr></thead>
      <tbody>${absentRows}</tbody>
    </table>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af">
    GIS-KIA Digital Attendance System · Kotoka International Airport · Generated automatically every Monday
  </div>
</div></body></html>`;
}

// Cron: every Monday at 6am UTC (6am GMT = 6am Ghana time)
const _weeklyReportCron = new CronJob("weekly-report", {
  title: "Weekly Attendance Report",
  schedule: "0 6 * * 1", // Every Monday at 6am
  endpoint: sendWeeklyReport,
});

export const sendWeeklyReport = api(
  { expose: false, method: "POST", path: "/attendance/weekly-report" },
  async (): Promise<{ sent: boolean; message: string }> => {
    const stats = await getWeeklyStats();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const fmt = (d: Date) => d.toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GmailUser(), pass: GmailPass() },
    });

    await transporter.sendMail({
      from: `"GIS-KIA Attendance System" <${GmailUser()}>`,
      to: CommanderEmail(),
      subject: `📊 Weekly Attendance Report — ${fmt(weekStart)} to ${fmt(now)}`,
      html: buildEmailHTML(stats, fmt(weekStart), fmt(now)),
    });

    return { sent: true, message: `Weekly report sent to ${CommanderEmail()}` };
  }
);
