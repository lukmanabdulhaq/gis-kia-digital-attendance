import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface CreateUserRequest {
  email: string;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  pin: string;
}

interface CreateUserResponse {
  id: number;
  staffId: string;
  fullName: string;
}

// Creates a new staff user (admin only).
export const createUser = api<CreateUserRequest, CreateUserResponse>(
  { expose: true, method: "POST", path: "/users/create", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    if (authData.role !== "admin") throw APIError.permissionDenied("Admin only");
    const row = await db.queryRow<{ id: number }>`
      INSERT INTO users (email, staff_id, full_name, role, rank, shift, pin_hash)
      VALUES (${req.email}, ${req.staffId}, ${req.fullName}, ${req.role}, ${req.rank}, ${req.shift}, ${req.pin})
      RETURNING id
    `;
    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${parseInt(authData.userID)}, 'create_user', ${`Admin created user ${req.staffId} - ${req.fullName}`})
    `;
    return { id: row!.id, staffId: req.staffId, fullName: req.fullName };
  }
);
