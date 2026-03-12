import { CronJob } from "encore.dev/cron";
import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";

const firebaseServiceAccount = secret("FirebaseServiceAccount");

// Shift start times (24h, UTC = GMT = Ghana time)
const SHIFT_STARTS: Record<string, { hour: number; minute: number }> = {
  morning:   { hour: 6,  minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  night:     { hour: 22, minute: 0 },
};
const LATE_GRACE_MINUTES = 15; // alert 15 min after shift start

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const pemContents = sa.private_key.replace(/\\n/g, "\n").replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s+/g, "");
  const cryptoKey = await crypto.subtle.importKey("pkcs8", Buffer.from(pemContents, "base64"), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` });
  return ((await tokenResp.json()) as { access_token: string }).access_token;
}

async function sendFCM(tokens: string[], title: string, body: string, data: Record<string, string>) {
  const saJson = firebaseServiceAccount();
  if (!saJson || saJson === "placeholder") return;
  const accessToken = await getAccessToken(saJson);
  const projectId = JSON.parse(saJson).project_id;
  await Promise.all(tokens.map((token) =>
    fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message: { token, notification: { title, body }, data, webpush: { notification: { title, body, icon: "/icon-192.png", requireInteraction: true }, fcm_options: { link: "/dashboard" } } } }),
    }).catch((e) => console.error("FCM send failed:", e))
  ));
}

// Run every 15 minutes to check for late officers
const _lateAlertCron = new CronJob("late-alert", {
  title: "Late Officer Alert",
  every: "15m",
  endpoint: checkLateOfficers,
});

export const checkLateOfficers = api(
  { expose: false, method: "POST", path: "/attendance/check-late" },
  async (): Promise<{ alerted: number; lateOfficers: string[] }> => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Find which shift(s) should have started and are within the alert window
    const shiftsToCheck: string[] = [];
    for (const [shift, time] of Object.entries(SHIFT_STARTS)) {
      const shiftStartMinutes = time.hour * 60 + time.minute;
      const nowMinutes = currentHour * 60 + currentMinute;
      const diff = nowMinutes - shiftStartMinutes;
      // Alert between 15 and 30 minutes after shift start
      if (diff >= LATE_GRACE_MINUTES && diff < LATE_GRACE_MINUTES + 15) {
        shiftsToCheck.push(shift);
      }
    }

    if (shiftsToCheck.length === 0) return { alerted: 0, lateOfficers: [] };

    const lateOfficers: { id: number; fullName: string; staffId: string; shift: string }[] = [];

    for (const shift of shiftsToCheck) {
      // Find officers in this shift who haven't clocked in today
      const notClockedIn = await db.rawQueryAll<{ id: number; full_name: string; staff_id: string }>(
        `SELECT u.id, u.full_name, u.staff_id FROM users u
         WHERE u.shift = $1 AND u.role = 'officer'
         AND u.id NOT IN (
           SELECT user_id FROM attendance WHERE date = $2::date
         )`,
        shift, todayStr
      );

      for (const o of notClockedIn) {
        lateOfficers.push({ id: o.id, fullName: o.full_name, staffId: o.staff_id, shift });
      }
    }

    if (lateOfficers.length === 0) return { alerted: 0, lateOfficers: [] };

    // Get supervisor push tokens
    const supervisorTokens = await db.rawQueryAll<{ token: string }>(
      `SELECT DISTINCT pt.token FROM push_tokens pt
       JOIN users u ON pt.user_id = u.id
       WHERE u.role IN ('supervisor', 'admin')`
    );

    const tokens = supervisorTokens.map((r) => r.token);
    if (tokens.length > 0) {
      const names = lateOfficers.map((o) => o.fullName).join(", ");
      const shift = lateOfficers[0].shift;
      await sendFCM(
        tokens,
        `⚠️ Late Officers — ${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift`,
        `${lateOfficers.length} officer${lateOfficers.length > 1 ? "s have" : " has"} not clocked in: ${names}`,
        { type: "late_alert", count: String(lateOfficers.length), shift }
      );
    }

    // Log it
    await db.rawQueryAll(
      `INSERT INTO system_logs (action, details) VALUES ('late_alert', $1)`,
      `Auto-alert: ${lateOfficers.length} late officer(s) — ${lateOfficers.map((o) => o.staffId).join(", ")}`
    );

    return {
      alerted: lateOfficers.length,
      lateOfficers: lateOfficers.map((o) => `${o.fullName} (${o.staffId}) — ${o.shift}`),
    };
  }
);
