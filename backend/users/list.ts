import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface User {
  id: number;
  email: string;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  createdAt: Date;
}

interface ListUsersResponse {
  users: User[];
}

// Lists all registered users (supervisor and admin only).
export const listUsers = api<void, ListUsersResponse>(
  { expose: true, method: "GET", path: "/users/list", auth: true },
  async () => {
    const authData = getAuthData()!;
    if (authData.role === "officer") throw APIError.permissionDenied("Access denied");
    const rows = await db.queryAll<{
      id: number;
      email: string;
      staff_id: string;
      full_name: string;
      role: string;
      rank: string;
      shift: string;
      created_at: Date;
    }>`
      SELECT id, email, staff_id, full_name, role, rank, shift, created_at
      FROM users ORDER BY full_name
    `;
    return {
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        staffId: r.staff_id,
        fullName: r.full_name,
        role: r.role,
        rank: r.rank,
        shift: r.shift,
        createdAt: r.created_at,
      })),
    };
  }
);
