import { api, Cookie } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface LogoutRequest {
  refreshToken?: string;
}

interface LogoutResponse {
  session: Cookie<"gis_session">;
  ok: boolean;
}

// Logs out the authenticated user and invalidates their refresh token.
export const logout = api<LogoutRequest, LogoutResponse>(
  { expose: true, method: "POST", path: "/auth/logout", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    if (req.refreshToken) {
      await db.exec`DELETE FROM refresh_tokens WHERE token = ${req.refreshToken}`;
    } else {
      await db.exec`DELETE FROM refresh_tokens WHERE user_id = ${parseInt(authData.userID)}`;
    }
    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${parseInt(authData.userID)}, 'logout', ${`Staff ${authData.staffId} logged out`})
    `;
    return {
      ok: true,
      session: {
        value: "",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 0,
        path: "/",
      },
    };
  }
);
