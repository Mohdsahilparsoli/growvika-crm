import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { db } from "@/server/db";
import { createSession, dbError, fail, json, verifyResetToken } from "@/server/auth";

// Recovery key set in Vercel (Settings → Environment Variables → ADMIN_RESET_KEY).
// Works only for admin accounts and only when the key is set.
function keyMatches(given: string) {
  const key = process.env.ADMIN_RESET_KEY ?? "";
  if (key.length < 12 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET() {
  return json({ recoveryKey: (process.env.ADMIN_RESET_KEY ?? "").length >= 12 });
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const password = String(b.password ?? "");
    if (password.length < 8) return fail("New password must be at least 8 characters");
    const p = await db();
    let userId: string | null = null;

    if (b.token) {
      userId = await verifyResetToken(String(b.token));
      if (!userId) return fail("This reset link has expired or was already used. Ask for a new one.", 400);
    } else {
      const email = String(b.email ?? "").trim().toLowerCase();
      if (!keyMatches(String(b.key ?? ""))) {
        await new Promise((r) => setTimeout(r, 800));
        return fail("Recovery key or email is not correct", 401);
      }
      const r = await p.query("SELECT id FROM gv_users WHERE LOWER(email) = $1 AND role = 'admin'", [email]);
      if (!r.rows[0]) return fail("Recovery key or email is not correct", 401);
      userId = r.rows[0].id;
      // Recovering an admin account also re-activates it
      await p.query("UPDATE gv_users SET active = TRUE WHERE id = $1", [userId]);
    }

    const hash = await bcrypt.hash(password, 10);
    await p.query("UPDATE gv_users SET password_hash = $1 WHERE id = $2", [hash, userId]);
    await createSession(userId!);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
