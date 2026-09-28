import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { createSession, dbError, fail, json } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    if (!email || !password) return fail("Please enter your email and password");
    const p = await db();
    const r = await p.query("SELECT id, password_hash, active FROM gv_users WHERE LOWER(email) = $1", [email]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return fail("Incorrect email or password", 401);
    if (!u.active) return fail("This account has been deactivated. Contact your admin.", 403);
    await createSession(u.id);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
