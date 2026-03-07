import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface AttendanceStatsResponse {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalOfficers: number;
  todayPresent: number;
  todayLate: number;
  weeklyTrend: { date: string; present: number; late: number; absent: number }[];
}

// Returns attendance statistics, scoped by role.
export const attendanceStats = api<void, AttendanceStatsResponse>(
  { expose: true, method: "GET", path: "/attendance/stats", auth: true },
  async () => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);
    const role = authData.role;

    const userFilter = role === "officer" ? `AND a.user_id = ${userId}` : "";

    const totalRow = await db.rawQueryRow<{ present: number; late: number; absent: number }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'late') as late,
        COUNT(*) FILTER (WHERE status = 'absent') as absent
       FROM attendance a WHERE 1=1 ${userFilter}`
    );

    const todayRow = await db.rawQueryRow<{ present: number; late: number }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'late') as late
       FROM attendance a WHERE date = CURRENT_DATE ${userFilter}`
    );

    const totalUsersRow = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM users WHERE role = 'officer'
    `;

    const weeklyRows = await db.rawQueryAll<{
      date: string;
      present: number;
      late: number;
      absent: number;
    }>(
      `SELECT date::text,
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'late') as late,
        COUNT(*) FILTER (WHERE status = 'absent') as absent
       FROM attendance a WHERE date >= CURRENT_DATE - INTERVAL '7 days' ${userFilter}
       GROUP BY date ORDER BY date ASC`
    );

    return {
      totalPresent: Number(totalRow?.present ?? 0),
      totalLate: Number(totalRow?.late ?? 0),
      totalAbsent: Number(totalRow?.absent ?? 0),
      totalOfficers: Number(totalUsersRow?.count ?? 0),
      todayPresent: Number(todayRow?.present ?? 0),
      todayLate: Number(todayRow?.late ?? 0),
      weeklyTrend: weeklyRows.map((r) => ({
        date: r.date,
        present: Number(r.present),
        late: Number(r.late),
        absent: Number(r.absent),
      })),
    };
  }
);
