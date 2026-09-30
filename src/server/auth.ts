import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { db } from "./db";
import { SESSION_COOKIE, sessionSecret, verifySessionToken } from "./token";
import { User } from "@/lib/types";

const COOKIE = SESSION_COOKIE;
const MAX_AGE = 60 * 60 * 24 * 30;
const secret = sessionSecret;

export type SessionUser = Omit<User, "password">;

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const sub = await verifySessionToken(token);
  if (!sub) return null;
  try {
    const p = await db();
    const r = await p.query("SELECT id, name, email, role, active FROM gv_users WHERE id = $1", [sub]);
    const u = r.rows[0];
    if (!u || !u.active) return null;
    return u as SessionUser;
  } catch {
    return null;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function requireUser(): Promise<SessionUser | Response> {
  try {
    const u = await currentUser();
    return u ?? fail("Please sign in again", 401);
  } catch (e) {
    return dbError(e);
  }
}

export function dbError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "NO_DATABASE") return fail("Database is not connected yet. Connect Neon Postgres in Vercel → Storage.", 503);
  console.error(e);
  return fail("Server error: " + msg, 500);
}

// ---- Password reset ----
// The token carries a fingerprint of the current password hash, so it stops
// working as soon as the password is changed (single use) or after 30 minutes.
const fingerprint = (hash: string) => createHash("sha256").update(hash).digest("hex").slice(0, 24);

export async function createResetToken(userId: string, passwordHash: string) {
  return new SignJWT({ sub: userId, purpose: "reset", fp: fingerprint(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret());
}

export async function verifyResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "reset" || typeof payload.sub !== "string") return null;
    const p = await db();
    const r = await p.query("SELECT password_hash, active FROM gv_users WHERE id = $1", [payload.sub]);
    const u = r.rows[0];
    if (!u || !u.active || fingerprint(u.password_hash) !== payload.fp) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// Public address of the app, used in reset links (never taken from the request's Host header in production)
export function appUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(req.url).origin;
}
