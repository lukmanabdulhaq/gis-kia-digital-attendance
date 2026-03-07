import { Header, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import db from "../db";

interface AuthParams {
  authorization?: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  email: string;
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  const token = params.authorization?.replace("Bearer ", "");
  if (!token) throw APIError.unauthenticated("missing token");
  const [staffId, pin] = token.split(":");
  if (!staffId || !pin) throw APIError.unauthenticated("invalid token format");
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
    FROM users WHERE staff_id = ${staffId}
  `;
  if (!user) throw APIError.unauthenticated("invalid credentials");
  if (user.pin_hash !== pin) throw APIError.unauthenticated("invalid credentials");
  return {
    userID: String(user.id),
    staffId: user.staff_id,
    fullName: user.full_name,
    role: user.role,
    rank: user.rank,
    shift: user.shift,
    email: user.email,
  };
});

export const gw = new Gateway({ authHandler: auth });
