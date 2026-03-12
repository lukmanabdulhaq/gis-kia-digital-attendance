import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import * as crypto from "crypto";
import db from "../db";

interface WebAuthnRegisterStartResponse {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment: string;
    requireResidentKey: boolean;
    userVerification: string;
  };
}

// Generates a WebAuthn registration challenge for the authenticated user.
export const webauthnRegisterStart = api<void, WebAuthnRegisterStartResponse>(
  { expose: true, method: "POST", path: "/auth/webauthn/register/start", auth: true },
  async () => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);

    const challenge = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.exec`
      DELETE FROM webauthn_challenges WHERE user_id = ${userId} AND type = 'register'
    `;
    await db.exec`
      INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at)
      VALUES (${userId}, ${challenge}, 'register', ${expiresAt})
    `;

    return {
      challenge,
      rpId: "gis-kia-attendance.vercel.app",
      rpName: "GIS KIA Digital Attendance",
      userId: authData.userID,
      userName: authData.staffId,
      userDisplayName: `${authData.rank} ${authData.fullName}`,
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: false,
        userVerification: "preferred",
      },
    };
  }
);
