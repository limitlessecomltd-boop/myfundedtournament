"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/types";
import { userApi } from "@/lib/api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("fc_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    const token = localStorage.getItem("fc_token");
    if (token) {
      userApi.getMe()
        .then(u => { setUser(u); localStorage.setItem("fc_user", JSON.stringify(u)); })
        .catch(() => { localStorage.removeItem("fc_token"); localStorage.removeItem("fc_user"); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { user } = await userApi.login(email, password);
    setUser(user);
  }

  async function register(email: string, password: string, username?: string) {
    const { user } = await userApi.register({ email, password, username });
    setUser(user);
  }

  function logout() {
    userApi.logout();
    setUser(null);
  }

  async function refresh() {
    const u = await userApi.getMe();
    setUser(u);
    localStorage.setItem("fc_user", JSON.stringify(u));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
