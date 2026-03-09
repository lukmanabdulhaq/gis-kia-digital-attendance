import { api, APIError, Cookie } from "encore.dev/api";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import db from "../db";
import { signToken } from "./auth";

interface LoginRequest {
  staffId: string;
  pin: string;
}

interface LoginResponse {
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

// Authenticates a staff member, returns a signed JWT and sets HttpOnly session cookie.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const user = await db.queryRow<{
      id: number;
      staff_id: string;
      full_name: string;
      role: string;
      rank: string;
      shift: string;
      email: string;
      pin_hash: string;
      password_hash: string | null;
    }>`
      SELECT id, staff_id, full_name, role, rank, shift, email, pin_hash, password_hash
      FROM users WHERE staff_id = ${req.staffId.trim().toUpperCase()}
    `;

    if (!user) throw APIError.unauthenticated("Invalid Staff ID or PIN");

    let valid = false;
    if (user.password_hash && user.password_hash.startsWith("$2")) {
      valid = await bcrypt.compare(req.pin, user.password_hash);
    }
    if (!valid) {
      valid = user.pin_hash === req.pin;
    }
    if (!valid) throw APIError.unauthenticated("Invalid Staff ID or PIN");

    const tokenPayload = {
      userId: String(user.id),
      staffId: user.staff_id,
      fullName: user.full_name,
      role: user.role,
      rank: user.rank,
      shift: user.shift,
      email: user.email,
    };

    const accessToken = signToken(tokenPayload);

    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.exec`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${refreshToken}, ${expiresAt})
    `;

    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${user.id}, 'login', ${`Staff ${user.staff_id} logged in via JWT`})
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
