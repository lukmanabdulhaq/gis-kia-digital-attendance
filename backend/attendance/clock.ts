import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface ClockRequest {
  action: "in" | "out";
}

interface ClockResponse {
  id: number;
  action: string;
  time: Date;
  status: string;
  message: string;
}

// Records a clock-in or clock-out action for the authenticated officer.
export const clock = api<ClockRequest, ClockResponse>(
  { expose: true, method: "POST", path: "/attendance/clock", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);
    const today = new Date().toISOString().split("T")[0];

    const existing = await db.queryRow<{
      id: number;
      clock_in: Date | null;
      clock_out: Date | null;
      status: string;
    }>`
      SELECT id, clock_in, clock_out, status
      FROM attendance WHERE user_id = ${userId} AND date = ${today}::date
    `;

    if (req.action === "in") {
      if (existing && existing.clock_in) {
        throw APIError.alreadyExists("Already clocked in today");
      }
      const now = new Date();
      const hour = now.getHours();
      let status = "present";
      const shift = authData.shift;
      if (shift === "morning" && hour >= 8) status = "late";
      else if (shift === "afternoon" && hour >= 14) status = "late";
      else if (shift === "night" && hour >= 22) status = "late";

      let record;
      if (existing) {
        record = await db.queryRow<{ id: number }>`
          UPDATE attendance SET clock_in = NOW(), status = ${status}
          WHERE id = ${existing.id} RETURNING id
        `;
      } else {
        record = await db.queryRow<{ id: number }>`
          INSERT INTO attendance (user_id, clock_in, date, status)
          VALUES (${userId}, NOW(), ${today}::date, ${status}) RETURNING id
        `;
      }
      await db.exec`
        INSERT INTO system_logs (user_id, action, details)
        VALUES (${userId}, 'clock_in', ${`Staff ${authData.staffId} clocked in - ${status}`})
      `;
      return {
        id: record!.id,
        action: "in",
        time: now,
        status,
        message: `Clocked IN at ${now.toLocaleTimeString("en-GH")} - Welcome ${authData.rank} ${authData.fullName}`,
      };
    } else {
      if (!existing || !existing.clock_in) {
        throw APIError.failedPrecondition("Must clock in first");
      }
      if (existing.clock_out) {
        throw APIError.alreadyExists("Already clocked out today");
      }
      const now = new Date();
      await db.exec`UPDATE attendance SET clock_out = NOW() WHERE id = ${existing.id}`;
      await db.exec`
        INSERT INTO system_logs (user_id, action, details)
        VALUES (${userId}, 'clock_out', ${`Staff ${authData.staffId} clocked out`})
      `;
      return {
        id: existing.id,
        action: "out",
        time: now,
        status: existing.status,
        message: `Clocked OUT at ${now.toLocaleTimeString("en-GH")} - Goodbye ${authData.rank} ${authData.fullName}`,
      };
    }
  }
);
