import { api, APIError, Cookie } from "encore.dev/api";
import db from "../db";
import { signToken } from "./auth";

interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
  session: Cookie<"gis_session">;
}

// Issues a new access token using a valid refresh token.
export const refresh = api<RefreshRequest, RefreshResponse>(
  { expose: true, method: "POST", path: "/auth/refresh" },
  async (req) => {
    const row = await db.queryRow<{
      user_id: number;
      expires_at: Date;
    }>`
      SELECT user_id, expires_at FROM refresh_tokens
      WHERE token = ${req.refreshToken}
    `;

    if (!row) throw APIError.unauthenticated("invalid refresh token");
    if (new Date(row.expires_at) < new Date()) {
      await db.exec`DELETE FROM refresh_tokens WHERE token = ${req.refreshToken}`;
      throw APIError.unauthenticated("refresh token expired");
    }

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
      FROM users WHERE id = ${row.user_id}
    `;

    if (!user) throw APIError.unauthenticated("user not found");

    const accessToken = signToken({
      userId: String(user.id),
      staffId: user.staff_id,
      fullName: user.full_name,
      role: user.role,
      rank: user.rank,
      shift: user.shift,
      email: user.email,
    });

    return {
      token: accessToken,
      session: {
        value: accessToken,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 3600,
        path: "/",
      },
    };
  }
);
