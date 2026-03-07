import { api, APIError } from "encore.dev/api";
import db from "../db";

interface LoginRequest {
  staffId: string;
  pin: string;
}

interface LoginResponse {
  token: string;
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

// Authenticates a staff member and returns a session token.
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
    }>`
      SELECT id, staff_id, full_name, role, rank, shift, email, pin_hash
      FROM users WHERE staff_id = ${req.staffId}
    `;
    if (!user || user.pin_hash !== req.pin) {
      throw APIError.unauthenticated("Invalid Staff ID or PIN");
    }
    const token = `${req.staffId}:${req.pin}`;
    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${user.id}, 'login', ${`Staff ${user.staff_id} logged in`})
    `;
    return {
      token,
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
