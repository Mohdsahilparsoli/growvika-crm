"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { DB, User } from "./types";
import { seedDB } from "./seed";

const DB_KEY = "growvika_crm_db_v2";
const SESSION_KEY = "growvika_crm_session_v2";

interface StoreCtx {
  ready: boolean;
  db: DB;
  user: User | null;
  isAdmin: boolean;
  update: (fn: (d: DB) => DB) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  resetDemo: () => void;
  userName: (id: string) => string;
}

const Ctx = createContext<StoreCtx | null>(null);

export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(seedDB);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) setDb(JSON.parse(raw));
      const s = localStorage.getItem(SESSION_KEY);
      if (s) setUserId(s);
    } catch {}
    setReady(true);
  }, []);

  const persist = (next: DB) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(next));
    } catch {}
  };

  const update = useCallback((fn: (d: DB) => DB) => {
    setDb((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const login = (email: string, password: string) => {
    const u = db.users.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password && x.active
    );
    if (!u) return false;
    setUserId(u.id);
    try {
      localStorage.setItem(SESSION_KEY, u.id);
    } catch {}
    return true;
  };

  const logout = () => {
    setUserId(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  const resetDemo = () => {
    const fresh = seedDB();
    setDb(fresh);
    persist(fresh);
  };

  const user = db.users.find((u) => u.id === userId && u.active) ?? null;
  const userName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "—";

  return (
    <Ctx.Provider
      value={{ ready, db, user, isAdmin: user?.role === "admin", update, login, logout, resetDemo, userName }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
