import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./token";
import { snapshot } from "./data";
import type { SessionUser } from "./auth";
import type { DB } from "@/lib/types";

export type Initial = { user: SessionUser; db: DB };

// Loads the signed-in user and all their data while the page is rendered on the
// server, so the app opens straight away with no loading screen.
//   Initial      -> ready to show
//   "signed-out" -> no valid session (or the account was deactivated)
//   null         -> could not load (e.g. database down); the browser will retry
export const loadInitial = cache(async (): Promise<Initial | "signed-out" | null> => {
  const jar = await cookies();
  const sub = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!sub) return "signed-out";
  try {
    const p = await db();
    const r = await p.query("SELECT id, name, email, role, active FROM gv_users WHERE id = $1", [sub]);
    const user = r.rows[0] as SessionUser | undefined;
    if (!user || !user.active) return "signed-out";
    return { user, db: await snapshot(user) };
  } catch {
    return null;
  }
});
