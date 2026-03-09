import { api, APIError, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import db from "../db";

const firebaseServerKey = secret("FirebaseServerKey");

interface MusterRequest {
  shift: Query<string>;
  message?: Query<string>;
}

interface MusterResponse {
  sent: number;
  failed: number;
  shift: string;
  notifiedOfficers: string[];
}

async function sendFCMNotification(tokens: string[], title: string, body: string, data: Record<string, string>): Promise<{ success: number; failure: number }> {
  const key = firebaseServerKey();
  if (!key || key === "placeholder") {
    return { success: 0, failure: tokens.length };
  }

  const payload = {
    registration_ids: tokens,
    notification: { title, body, icon: "/manifest.json", badge: "/manifest.json" },
    data,
    priority: "high",
  };

  try {
    const resp = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) return { success: 0, failure: tokens.length };
    const result = await resp.json() as { success: number; failure: number };
    return { success: result.success ?? 0, failure: result.failure ?? tokens.length };
  } catch {
    return { success: 0, failure: tokens.length };
  }
}

// Triggers a roll call for a specific shift, sending FCM push notifications to officers (admin only).
export const muster = api<MusterRequest, MusterResponse>(
  { expose: true, method: "POST", path: "/attendance/muster", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    if (authData.role !== "admin" && authData.role !== "supervisor") {
      throw APIError.permissionDenied("Admin or Supervisor only");
    }

    const validShifts = ["morning", "afternoon", "night", "all"];
    if (!validShifts.includes(req.shift)) {
      throw APIError.invalidArgument(`Invalid shift. Must be one of: ${validShifts.join(", ")}`);
    }

    let officers: { id: number; staff_id: string; full_name: string }[];
    if (req.shift === "all") {
      officers = await db.queryAll<{ id: number; staff_id: string; full_name: string }>`
        SELECT id, staff_id, full_name FROM users WHERE role IN ('officer', 'supervisor')
      `;
    } else {
      officers = await db.rawQueryAll<{ id: number; staff_id: string; full_name: string }>(
        `SELECT id, staff_id, full_name FROM users WHERE role IN ('officer', 'supervisor') AND shift = $1`,
        req.shift
      );
    }

    if (officers.length === 0) {
      return { sent: 0, failed: 0, shift: req.shift, notifiedOfficers: [] };
    }

    const officerIds = officers.map((o) => o.id);
    const tokenRows = await db.rawQueryAll<{ token: string }>(
      `SELECT DISTINCT token FROM push_tokens WHERE user_id = ANY($1::bigint[])`,
      `{${officerIds.join(",")}}`
    );

    const tokens = tokenRows.map((r) => r.token);
    const shiftLabel = req.shift === "all" ? "All Shifts" : `Shift ${req.shift.charAt(0).toUpperCase() + req.shift.slice(1)}`;
    const title = "Roll Call — GIS KIA";
    const body = req.message ?? `Roll call initiated for ${shiftLabel}. Please clock in immediately.`;

    let sent = 0;
    let failed = 0;
    if (tokens.length > 0) {
      const result = await sendFCMNotification(tokens, title, body, {
        type: "muster",
        shift: req.shift,
        timestamp: new Date().toISOString(),
      });
      sent = result.success;
      failed = result.failure;
    }

    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${parseInt(authData.userID)}, 'muster', ${`${authData.role} ${authData.staffId} triggered roll call for ${req.shift} shift — ${officers.length} officers, ${tokens.length} push tokens`})
    `;

    return {
      sent,
      failed,
      shift: req.shift,
      notifiedOfficers: officers.map((o) => `${o.full_name} (${o.staff_id})`),
    };
  }
);
