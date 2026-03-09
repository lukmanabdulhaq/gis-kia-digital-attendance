import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import backend from "~backend/client";

export interface AuthUser {
  id: number;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  email: string;
}

const TOKEN_KEY = "gis_jwt";
const REFRESH_KEY = "gis_refresh";
const USER_KEY = "gis_user";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((currentToken: string, currentRefreshToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const resp = await backend.auth.refresh({ refreshToken: currentRefreshToken });
        const newToken = resp.token;
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        scheduleRefresh(newToken, currentRefreshToken);
      } catch {
        logout();
      }
    }, 50 * 60 * 1000);
  }, []);

  const login = useCallback(
    (newToken: string, newUser: AuthUser, newRefreshToken: string) => {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(REFRESH_KEY, newRefreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);
      scheduleRefresh(newToken, newRefreshToken);
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_KEY);
    const t = localStorage.getItem(TOKEN_KEY);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (t) {
      try {
        const client = backend.with({ auth: async () => ({ authorization: `Bearer ${t}` }) });
        await client.auth.logout({ refreshToken: rt ?? undefined });
      } catch {}
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (token && refreshToken) {
      scheduleRefresh(token, refreshToken);
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  return {
    token,
    refreshToken,
    user,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };
}
