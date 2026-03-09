import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface WebAuthnRegisterFinishRequest {
  credentialId: string;
  clientDataJSON: string;
  attestationObject: string;
  publicKey: string;
}

interface WebAuthnRegisterFinishResponse {
  success: boolean;
  message: string;
}

// Completes WebAuthn registration by storing the credential public key.
export const webauthnRegisterFinish = api<WebAuthnRegisterFinishRequest, WebAuthnRegisterFinishResponse>(
  { expose: true, method: "POST", path: "/auth/webauthn/register/finish", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);

    const challengeRow = await db.queryRow<{ challenge: string; expires_at: Date }>`
      SELECT challenge, expires_at FROM webauthn_challenges
      WHERE user_id = ${userId} AND type = 'register'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!challengeRow) throw APIError.failedPrecondition("No pending registration challenge");
    if (new Date(challengeRow.expires_at) < new Date()) {
      throw APIError.failedPrecondition("Registration challenge expired");
    }

    let clientData: { type: string; challenge: string; origin: string };
    try {
      const decoded = Buffer.from(req.clientDataJSON, "base64").toString("utf-8");
      clientData = JSON.parse(decoded);
    } catch {
      throw APIError.invalidArgument("Invalid clientDataJSON");
    }

    if (clientData.type !== "webauthn.create") {
      throw APIError.invalidArgument("Invalid clientData type");
    }

    const existingCred = await db.queryRow<{ id: number }>`
      SELECT id FROM webauthn_credentials WHERE credential_id = ${req.credentialId}
    `;
    if (existingCred) throw APIError.alreadyExists("Credential already registered");

    await db.exec`
      INSERT INTO webauthn_credentials (user_id, credential_id, public_key, sign_count)
      VALUES (${userId}, ${req.credentialId}, ${req.publicKey}, 0)
    `;

    await db.exec`
      DELETE FROM webauthn_challenges WHERE user_id = ${userId} AND type = 'register'
    `;

    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${userId}, 'webauthn_register', ${`Staff ${authData.staffId} registered biometric credential`})
    `;

    return { success: true, message: "Biometric credential registered successfully" };
  }
);
