"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { DB, User } from "./types";
import { emptyDB } from "./defaults";

type Status = "loading" | "ready" | "signed-out" | "no-database" | "error";

interface StoreCtx {
  ready: boolean;
  status: Status;
  db: DB;
  user: User | null;
  isAdmin: boolean;
  saving: boolean;
  error: string;
  clearError: () => void;
  update: (fn: (d: DB) => DB) => void;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  userName: (id: string) => string;
}

const Ctx = createContext<StoreCtx | null>(null);

export const uid = (p: string) =>
  `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

const COLS = ["clients", "payments", "leads", "comms", "expenses"] as const;

async function pushChanges(prev: DB, next: DB) {
  for (const col of COLS) {
    const a = new Map((prev[col] as { id: string }[]).map((r) => [r.id, r]));
    const b = new Map((next[col] as { id: string }[]).map((r) => [r.id, r]));
    for (const [id, rec] of b) {
      const old = a.get(id);
      if (!old) await api("POST", `/api/records/${col}`, rec);
      else if (JSON.stringify(old) !== JSON.stringify(rec)) await api("PATCH", `/api/records/${col}/${encodeURIComponent(id)}`, rec);
    }
    for (const id of a.keys()) {
      if (!b.has(id)) await api("DELETE", `/api/records/${col}/${encodeURIComponent(id)}`);
    }
  }

  const pu = new Map(prev.users.map((u) => [u.id, u]));
  for (const u of next.users) {
    const old = pu.get(u.id);
    if (!old) await api("POST", "/api/users", u);
    else if (JSON.stringify(old) !== JSON.stringify(u)) await api("PATCH", `/api/users/${encodeURIComponent(u.id)}`, u);
  }

  const companyChanged = JSON.stringify(prev.company) !== JSON.stringify(next.company);
  const settingsChanged = JSON.stringify(prev.settings) !== JSON.stringify(next.settings);
  if (companyChanged || settingsChanged) {
    await api("PUT", "/api/settings", {
      ...(companyChanged ? { company: next.company } : {}),
      ...(settingsChanged ? { settings: next.settings } : {}),
    });
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dbRef = useRef(db);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api("GET", "/api/data");
      dbRef.current = data.db;
      setDb(data.db);
      setUser(data.user);
      setStatus("ready");
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setUser(null);
        setStatus("signed-out");
      } else if (err.status === 503) {
        setStatus("no-database");
      } else {
        setError(err.message);
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    (fn: (d: DB) => DB) => {
      const prev = dbRef.current;
      const next = fn(prev);
      dbRef.current = next;
      setDb(next);
      pending.current += 1;
      setSaving(true);
      queue.current = queue.current.then(async () => {
        try {
          await pushChanges(prev, next);
        } catch (e) {
          setError((e as Error).message || "Could not save. Please try again.");
        } finally {
          pending.current -= 1;
          if (pending.current === 0) {
            await refresh();
            setSaving(false);
          }
        }
      });
    },
    [refresh]
  );

  const login = async (email: string, password: string) => {
    try {
      await api("POST", "/api/auth/login", { email, password });
      await refresh();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  const logout = async () => {
    await api("POST", "/api/auth/logout").catch(() => {});
    setUser(null);
    dbRef.current = emptyDB();
    setDb(dbRef.current);
    setStatus("signed-out");
  };

  const userName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "—";

  return (
    <Ctx.Provider
      value={{
        ready: status !== "loading",
        status,
        db,
        user,
        isAdmin: user?.role === "admin",
        saving,
        error,
        clearError: () => setError(""),
        update,
        refresh,
        login,
        logout,
        userName,
      }}
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
