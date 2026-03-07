import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface AttendanceRecord {
  id: number;
  userId: number;
  staffId: string;
  fullName: string;
  rank: string;
  shift: string;
  clockIn: Date | null;
  clockOut: Date | null;
  date: string;
  status: string;
}

interface ListAttendanceResponse {
  records: AttendanceRecord[];
}

interface ListAttendanceParams {
  startDate?: Query<string>;
  endDate?: Query<string>;
  userId?: Query<number>;
  shift?: Query<string>;
}

// Lists attendance records, filtered by role and optional query parameters.
export const listAttendance = api<ListAttendanceParams, ListAttendanceResponse>(
  { expose: true, method: "GET", path: "/attendance/list", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    const role = authData.role;
    const userId = parseInt(authData.userID);

    let query = `
      SELECT a.id, a.user_id, u.staff_id, u.full_name, u.rank, u.shift,
             a.clock_in, a.clock_out, a.date::text, a.status
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let idx = 1;

    if (role === "officer") {
      query += ` AND a.user_id = $${idx++}`;
      params.push(userId);
    }
    if (req.userId && role !== "officer") {
      query += ` AND a.user_id = $${idx++}`;
      params.push(req.userId);
    }
    if (req.startDate) {
      query += ` AND a.date >= $${idx++}::date`;
      params.push(req.startDate);
    }
    if (req.endDate) {
      query += ` AND a.date <= $${idx++}::date`;
      params.push(req.endDate);
    }
    if (req.shift) {
      query += ` AND u.shift = $${idx++}`;
      params.push(req.shift);
    }
    query += " ORDER BY a.date DESC, a.clock_in DESC LIMIT 200";

    const rows = await db.rawQueryAll<{
      id: number;
      user_id: number;
      staff_id: string;
      full_name: string;
      rank: string;
      shift: string;
      clock_in: Date | null;
      clock_out: Date | null;
      date: string;
      status: string;
    }>(query, ...params);

    return {
      records: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        staffId: r.staff_id,
        fullName: r.full_name,
        rank: r.rank,
        shift: r.shift,
        clockIn: r.clock_in,
        clockOut: r.clock_out,
        date: r.date,
        status: r.status,
      })),
    };
  }
);
