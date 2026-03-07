import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface AuthUser {
  id: number;
  staffId: string;
  fullName: string;
  role: string;
  rank: string;
  shift: string;
  email: string;
}

const TOKEN_KEY = "gis_token";
const USER_KEY = "gis_user";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  return {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };
}
