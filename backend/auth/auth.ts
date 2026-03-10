import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
import db from "../db";

const jwtSecret = secret("JWTSecret");

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"gis_session">;
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

export interface JWTPayload {
  userId: string;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  email: string;
  exp: number;
}

export function signToken(payload: Omit<JWTPayload, "exp">): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "1h" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, jwtSecret()) as JWTPayload;
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  const token = params.authorization?.replace("Bearer ", "") ?? params.session?.value;
  if (!token) throw APIError.unauthenticated("missing token");

  let payload: JWTPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw APIError.unauthenticated("invalid or expired token");
  }

  const user = await db.queryRow<{ id: number; staff_id: string }>`
    SELECT id, staff_id FROM users WHERE id = ${parseInt(payload.userId)}
  `;
  if (!user) throw APIError.unauthenticated("user not found");

  return {
    userID: payload.userId,
    staffId: payload.staffId,
    fullName: payload.fullName,
    role: payload.role,
    rank: payload.rank,
    shift: payload.shift,
    email: payload.email,
  };
});

export const gw = new Gateway({ authHandler: auth });
