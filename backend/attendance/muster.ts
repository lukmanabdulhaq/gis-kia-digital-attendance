import { api, APIError, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import db from "../db";

const firebaseServiceAccount = secret("FirebaseServiceAccount");

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

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const rawKey: string = sa.private_key;
  const normalizedKey = rawKey.replace(/\\n/g, "\n");
  const pemContents = normalizedKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const keyBuffer = Buffer.from(pemContents, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = (await tokenResp.json()) as { access_token: string };
  return tokenData.access_token;
}

async function sendFCMV1(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: number; failure: number }> {
  const saJson = firebaseServiceAccount();
  if (!saJson || saJson === "placeholder") {
    console.warn("FirebaseServiceAccount secret not set");
    return { success: 0, failure: tokens.length };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(saJson);
  } catch (e) {
    console.error("Failed to get FCM access token:", e);
    return { success: 0, failure: tokens.length };
  }

  const sa = JSON.parse(saJson);
  const projectId = sa.project_id;
  let success = 0;
  let failure = 0;

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const resp = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data,
                webpush: {
                  notification: {
                    title,
                    body,
                    icon: "/manifest.json",
                    requireInteraction: true,
                    actions: [{ action: "clock-in", title: "Clock In Now" }],
                  },
                  fcm_options: { link: "/clock" },
                },
              },
            }),
          }
        );
        if (resp.ok) {
          success++;
        } else {
          const err = await resp.json();
          console.error("FCM send error:", JSON.stringify(err));
          failure++;
        }
      } catch (e) {
        console.error("FCM token send failed:", e);
        failure++;
      }
    })
  );

  return { success, failure };
}

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
      officers = await db.queryAll<{ id: number; staff_id: string; full_name: string }>`
        SELECT id, staff_id, full_name FROM users
        WHERE role IN ('officer', 'supervisor') AND shift = ${req.shift}
      `;
    }

    if (officers.length === 0) {
      return { sent: 0, failed: 0, shift: req.shift, notifiedOfficers: [] };
    }

    const tokenRows: { token: string }[] = [];
    for (const officer of officers) {
      const rows = await db.queryAll<{ token: string }>`
        SELECT DISTINCT token FROM push_tokens WHERE user_id = ${officer.id}
      `;
      tokenRows.push(...rows);
    }

    const tokens = [...new Set(tokenRows.map((r) => r.token))];
    const shiftLabel = req.shift === "all" ? "All Shifts" : `Shift ${req.shift.charAt(0).toUpperCase() + req.shift.slice(1)}`;
    const title = "Roll Call — GIS KIA";
    const body = req.message ?? `Roll call initiated for ${shiftLabel}. Please clock in immediately.`;

    let sent = 0;
    let failed = 0;
    if (tokens.length > 0) {
      const result = await sendFCMV1(tokens, title, body, {
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
