import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from "react";
import api from "./api";

export type AppRole = "SuperAdmin" | "Admin" | "Staff";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: AppRole;
  avatarUrl: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>({
    id: '019dfceb-7f01-70b7-a797-d59fa092d608',
    username: 'admin',
    fullName: 'Guest Administrator',
    email: 'admin@example.com',
    role: 'SuperAdmin',
    avatarUrl: null
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<AuthUser>("/auth/me");
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (username: string, password: string, _remember: boolean) => {
    const data = await api.post<{ user: AuthUser; token: string }>("/auth/login", { username, password });
    setUser(data.user);
    // Token is stored in HttpOnly cookie by the server
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function canAccess(role: AppRole | undefined, route: string): boolean {
  if (!role) return false;
  if (route.startsWith("/settings")) return role === "SuperAdmin";
  if (route.startsWith("/users") || route.startsWith("/reports") || route.startsWith("/activity"))
    return role === "SuperAdmin" || role === "Admin";
  return true;
}
