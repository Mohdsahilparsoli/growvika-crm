import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { db, dbUrl } from "./db";
import { User } from "@/lib/types";

const COOKIE = "gv_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const raw = process.env.AUTH_SECRET || createHash("sha256").update("growvika:" + dbUrl()).digest("hex");
  return new TextEncoder().encode(raw);
}

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
  try {
    const { payload } = await jwtVerify(token, secret());
    const p = await db();
    const r = await p.query("SELECT id, name, email, role, active FROM gv_users WHERE id = $1", [payload.sub]);
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
