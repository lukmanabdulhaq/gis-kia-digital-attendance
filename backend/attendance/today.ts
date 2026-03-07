import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface TodayAttendanceResponse {
  record: {
    id: number;
    clockIn: Date | null;
    clockOut: Date | null;
    date: string;
    status: string;
  } | null;
}

// Returns today's attendance record for the authenticated user.
export const todayAttendance = api<void, TodayAttendanceResponse>(
  { expose: true, method: "GET", path: "/attendance/today", auth: true },
  async () => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);
    const today = new Date().toISOString().split("T")[0];
    const row = await db.queryRow<{
      id: number;
      clock_in: Date | null;
      clock_out: Date | null;
      date: string;
      status: string;
    }>`
      SELECT id, clock_in, clock_out, date::text, status
      FROM attendance WHERE user_id = ${userId} AND date = ${today}::date
    `;
    return {
      record: row
        ? {
            id: row.id,
            clockIn: row.clock_in,
            clockOut: row.clock_out,
            date: row.date,
            status: row.status,
          }
        : null,
    };
  }
);
