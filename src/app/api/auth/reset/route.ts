import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { createSession, dbError, fail, json, verifyResetToken } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const password = String(b.password ?? "");
    if (password.length < 8) return fail("New password must be at least 8 characters");
    const userId = await verifyResetToken(String(b.token ?? ""));
    if (!userId) return fail("This reset link has expired or was already used. Ask for a new one.", 400);
    const p = await db();
    await p.query("UPDATE gv_users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(password, 10), userId]);
    await createSession(userId);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
