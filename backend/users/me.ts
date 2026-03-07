import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";

interface MeResponse {
  id: string;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  email: string;
}

// Returns the authenticated user's profile information.
export const me = api<void, MeResponse>(
  { expose: true, method: "GET", path: "/users/me", auth: true },
  async () => {
    const authData = getAuthData()!;
    return {
      id: authData.userID,
      staffId: authData.staffId,
      fullName: authData.fullName,
      role: authData.role,
      rank: authData.rank,
      shift: authData.shift,
      email: authData.email,
    };
  }
);
