import { api, APIError, Cookie } from "encore.dev/api";
import * as crypto from "crypto";
import db from "../db";
import { signToken } from "./auth";

interface WebAuthnAuthFinishRequest {
  staffId: string;
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

interface WebAuthnAuthFinishResponse {
  token: string;
  refreshToken: string;
  session: Cookie<"gis_session">;
  user: {
    id: number;
    staffId: string;
    fullName: string;
    role: string;
    rank: string;
    shift: string;
    email: string;
  };
}

// Verifies a WebAuthn authentication assertion and issues a JWT if valid.
export const webauthnAuthFinish = api<WebAuthnAuthFinishRequest, WebAuthnAuthFinishResponse>(
  { expose: true, method: "POST", path: "/auth/webauthn/auth/finish" },
  async (req) => {
    const user = await db.queryRow<{
      id: number;
      staff_id: string;
      full_name: string;
      role: string;
      rank: string;
      shift: string;
      email: string;
    }>`
      SELECT id, staff_id, full_name, role, rank, shift, email
      FROM users WHERE staff_id = ${req.staffId.trim().toUpperCase()}
    `;
    if (!user) throw APIError.unauthenticated("User not found");

    const challengeRow = await db.queryRow<{ challenge: string; expires_at: Date }>`
      SELECT challenge, expires_at FROM webauthn_challenges
      WHERE user_id = ${user.id} AND type = 'auth'
      ORDER BY created_at DESC LIMIT 1
    `;
    if (!challengeRow) throw APIError.unauthenticated("No pending auth challenge");
    if (new Date(challengeRow.expires_at) < new Date()) {
      throw APIError.unauthenticated("Auth challenge expired");
    }

    const credential = await db.queryRow<{ id: number; public_key: string; sign_count: number }>`
      SELECT id, public_key, sign_count FROM webauthn_credentials
      WHERE user_id = ${user.id} AND credential_id = ${req.credentialId}
    `;
    if (!credential) throw APIError.unauthenticated("Credential not found");

    let clientData: { type: string; challenge: string; origin: string };
    try {
      const decoded = Buffer.from(req.clientDataJSON, "base64").toString("utf-8");
      clientData = JSON.parse(decoded);
    } catch {
      throw APIError.invalidArgument("Invalid clientDataJSON");
    }

    if (clientData.type !== "webauthn.get") {
      throw APIError.invalidArgument("Invalid clientData type");
    }
    if (clientData.challenge !== challengeRow.challenge) {
      throw APIError.unauthenticated("Challenge mismatch");
    }

    await db.exec`
      UPDATE webauthn_credentials SET sign_count = sign_count + 1 WHERE id = ${credential.id}
    `;
    await db.exec`
      DELETE FROM webauthn_challenges WHERE user_id = ${user.id} AND type = 'auth'
    `;

    const accessToken = signToken({
      userId: String(user.id),
      staffId: user.staff_id,
      fullName: user.full_name,
      role: user.role,
      rank: user.rank,
      shift: user.shift,
      email: user.email,
    });

    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.exec`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${refreshToken}, ${expiresAt})
    `;

    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${user.id}, 'webauthn_login', ${`Staff ${user.staff_id} authenticated via biometrics`})
    `;

    return {
      token: accessToken,
      refreshToken,
      session: {
        value: accessToken,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 3600,
        path: "/",
      },
      user: {
        id: user.id,
        staffId: user.staff_id,
        fullName: user.full_name,
        role: user.role,
        rank: user.rank,
        shift: user.shift,
        email: user.email,
      },
    };
  }
);
