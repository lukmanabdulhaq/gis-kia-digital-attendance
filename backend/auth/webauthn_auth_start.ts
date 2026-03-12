import { api, APIError } from "encore.dev/api";
import * as crypto from "crypto";
import db from "../db";

interface WebAuthnAuthStartRequest {
  staffId: string;
}

interface WebAuthnAuthStartResponse {
  challenge: string;
  rpId: string;
  timeout: number;
  userVerification: string;
  allowCredentials: { type: string; id: string }[];
}

// Generates a WebAuthn authentication challenge for the given staff ID.
export const webauthnAuthStart = api<WebAuthnAuthStartRequest, WebAuthnAuthStartResponse>(
  { expose: true, method: "POST", path: "/auth/webauthn/auth/start" },
  async (req) => {
    const user = await db.queryRow<{ id: number; staff_id: string }>`
      SELECT id, staff_id FROM users WHERE staff_id = ${req.staffId.trim().toUpperCase()}
    `;
    if (!user) throw APIError.notFound("User not found");

    const credentials = await db.queryAll<{ credential_id: string }>`
      SELECT credential_id FROM webauthn_credentials WHERE user_id = ${user.id}
    `;
    if (credentials.length === 0) {
      throw APIError.failedPrecondition("No biometric credentials registered for this user");
    }

    const challenge = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.exec`
      DELETE FROM webauthn_challenges WHERE user_id = ${user.id} AND type = 'auth'
    `;
    await db.exec`
      INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at)
      VALUES (${user.id}, ${challenge}, 'auth', ${expiresAt})
    `;

    return {
      challenge,
      rpId: "gis-kia-attendance.vercel.app",
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials: credentials.map((c) => ({ type: "public-key", id: c.credential_id })),
    };
  }
);
