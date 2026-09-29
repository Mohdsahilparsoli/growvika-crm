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

type Col = (typeof COLS)[number];
interface PushResult {
  saved: { col: Col; rec: { id: string } }[];
  deleted: { col: Col; id: string }[];
  needsRefresh: boolean; // team, company or settings changed: reload everything once
}

// Sends only what changed. Each record is saved on its own and the server's saved
// copy is returned, so the app does not need to download all data again.
async function pushChanges(prev: DB, next: DB): Promise<PushResult> {
  const out: PushResult = { saved: [], deleted: [], needsRefresh: false };
  for (const col of COLS) {
    const a = new Map((prev[col] as { id: string }[]).map((r) => [r.id, r]));
    const b = new Map((next[col] as { id: string }[]).map((r) => [r.id, r]));
    for (const [id, rec] of b) {
      const old = a.get(id);
      if (!old) out.saved.push({ col, rec: (await api("POST", `/api/records/${col}`, rec)).record });
      else if (JSON.stringify(old) !== JSON.stringify(rec)) out.saved.push({ col, rec: (await api("PATCH", `/api/records/${col}/${encodeURIComponent(id)}`, rec)).record });
    }
    for (const id of a.keys()) {
      if (!b.has(id)) {
        await api("DELETE", `/api/records/${col}/${encodeURIComponent(id)}`);
        out.deleted.push({ col, id });
      }
    }
  }

  const pu = new Map(prev.users.map((u) => [u.id, u]));
  for (const u of next.users) {
    const old = pu.get(u.id);
    if (!old) await api("POST", "/api/users", u);
    else if (JSON.stringify(old) !== JSON.stringify(u)) await api("PATCH", `/api/users/${encodeURIComponent(u.id)}`, u);
    else continue;
    out.needsRefresh = true;
  }

  const companyChanged = JSON.stringify(prev.company) !== JSON.stringify(next.company);
  const settingsChanged = JSON.stringify(prev.settings) !== JSON.stringify(next.settings);
  if (companyChanged || settingsChanged) {
    await api("PUT", "/api/settings", {
      ...(companyChanged ? { company: next.company } : {}),
      ...(settingsChanged ? { settings: next.settings } : {}),
    });
    out.needsRefresh = true;
  }
  return out;
}

// Put the server's saved copies into the local data (no full reload needed)
function applySaved(d: DB, r: PushResult): DB {
  const nd = { ...d } as DB;
  for (const col of COLS) {
    const saved = r.saved.filter((x) => x.col === col && x.rec?.id);
    const gone = new Set(r.deleted.filter((x) => x.col === col).map((x) => x.id));
    if (!saved.length && !gone.size) continue;
    const list = (nd[col] as { id: string }[]).filter((x) => !gone.has(x.id));
    for (const { rec } of saved) {
      const i = list.findIndex((x) => x.id === rec.id);
      if (i >= 0) list[i] = rec;
      else list.push(rec);
    }
    (nd as unknown as Record<string, unknown>)[col] = list;
  }
  // Keep the "next invoice number" preview in step with new bills
  for (const { col, rec } of r.saved) {
    if (col !== "payments") continue;
    const n = Number(/(\d+)$/.exec((rec as { invoiceNo?: string }).invoiceNo ?? "")?.[1] ?? 0);
    if (n > nd.invoiceCounter) nd.invoiceCounter = n;
  }
  return nd;
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
  const needReload = useRef(false);

  const lastFetch = useRef(0);
  const userRef = useRef<User | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api("GET", "/api/data");
      lastFetch.current = Date.now();
      userRef.current = data.user;
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

  // See teammates' changes: reload when you come back to the tab after 5+ minutes
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && userRef.current && pending.current === 0 && Date.now() - lastFetch.current > 5 * 60_000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
        let reload = false;
        try {
          const r = await pushChanges(prev, next);
          // Team members only get limited data, so for them reload from the server
          if (r.needsRefresh || userRef.current?.role !== "admin") reload = true;
          else {
            dbRef.current = applySaved(dbRef.current, r);
            setDb(dbRef.current);
          }
        } catch (e) {
          setError((e as Error).message || "Could not save. Please try again.");
          reload = true;
        } finally {
          pending.current -= 1;
          needReload.current ||= reload;
          if (pending.current === 0) {
            if (needReload.current) await refresh();
            needReload.current = false;
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
