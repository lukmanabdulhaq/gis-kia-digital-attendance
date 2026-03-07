import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface DeleteUserRequest {
  id: number;
}

interface DeleteUserResponse {
  success: boolean;
}

// Permanently deletes a staff user and their attendance records (admin only).
export const deleteUser = api<DeleteUserRequest, DeleteUserResponse>(
  { expose: true, method: "DELETE", path: "/users/delete/:id", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    if (authData.role !== "admin") throw APIError.permissionDenied("Admin only");
    await db.exec`DELETE FROM attendance WHERE user_id = ${req.id}`;
    await db.exec`DELETE FROM system_logs WHERE user_id = ${req.id}`;
    await db.exec`DELETE FROM users WHERE id = ${req.id}`;
    await db.exec`
      INSERT INTO system_logs (user_id, action, details)
      VALUES (${parseInt(authData.userID)}, 'delete_user', ${`Admin deleted user id ${req.id}`})
    `;
    return { success: true };
  }
);
