import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface SavePushTokenRequest {
  token: string;
}

interface SavePushTokenResponse {
  ok: boolean;
}

// Saves a Firebase Cloud Messaging push token for the authenticated user.
export const savePushToken = api<SavePushTokenRequest, SavePushTokenResponse>(
  { expose: true, method: "POST", path: "/attendance/push-token", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    const userId = parseInt(authData.userID);

    await db.exec`
      INSERT INTO push_tokens (user_id, token)
      VALUES (${userId}, ${req.token})
      ON CONFLICT (user_id, token) DO NOTHING
    `;

    return { ok: true };
  }
);
