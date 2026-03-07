import { useMemo } from "react";
import backend from "~backend/client";

export function useBackend(token: string | null) {
  return useMemo(() => {
    if (!token) return backend;
    return backend.with({
      auth: async () => ({ authorization: `Bearer ${token}` }),
    });
  }, [token]);
}
