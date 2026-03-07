import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface UpdateUserRequest {
  id: number;
  email: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
}

interface UpdateUserResponse {
  success: boolean;
}

// Updates an existing staff user's details (admin only).
export const updateUser = api<UpdateUserRequest, UpdateUserResponse>(
  { expose: true, method: "PUT", path: "/users/update/:id", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    if (authData.role !== "admin") throw APIError.permissionDenied("Admin only");
    await db.exec`
      UPDATE users SET email = ${req.email}, full_name = ${req.fullName},
      role = ${req.role}, rank = ${req.rank}, shift = ${req.shift}
      WHERE id = ${req.id}
    `;
    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${parseInt(authData.userID)}, 'update_user', ${`Admin updated user id ${req.id}`})
    `;
    return { success: true };
  }
);
