import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface LogEntry {
  id: number;
  userId: number | null;
  fullName: string | null;
  staffId: string | null;
  action: string;
  details: string | null;
  createdAt: Date;
}

interface ListLogsResponse {
  logs: LogEntry[];
}

// Returns the 100 most recent system audit logs (admin only).
export const listLogs = api<void, ListLogsResponse>(
  { expose: true, method: "GET", path: "/logs/list", auth: true },
  async () => {
    const authData = getAuthData()!;
    if (authData.role !== "admin") throw APIError.permissionDenied("Admin only");
    const rows = await db.queryAll<{
      id: number;
      user_id: number | null;
      full_name: string | null;
      staff_id: string | null;
      action: string;
      details: string | null;
      created_at: Date;
    }>`
      SELECT l.id, l.user_id, u.full_name, u.staff_id, l.action, l.details, l.created_at
      FROM system_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `;
    return {
      logs: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        fullName: r.full_name,
        staffId: r.staff_id,
        action: r.action,
        details: r.details,
        createdAt: r.created_at,
      })),
    };
  }
);
