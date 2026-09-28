import bcrypt from "bcryptjs";
import { db, setSetting } from "@/server/db";
import { createSession, dbError, fail, json } from "@/server/auth";
import { DEFAULT_COMPANY } from "@/lib/defaults";

export const dynamic = "force-dynamic";

async function userCount() {
  const p = await db();
  const r = await p.query("SELECT COUNT(*)::int AS n FROM gv_users");
  return r.rows[0].n as number;
}

export async function GET() {
  try {
    return json({ needsSetup: (await userCount()) === 0, database: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NO_DATABASE") return json({ needsSetup: false, database: false });
    return dbError(e);
  }
}

export async function POST(req: Request) {
  try {
    if ((await userCount()) > 0) return fail("Setup is already done. Please sign in.", 409);
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    if (!name) return fail("Enter your name");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email");
    if (password.length < 8) return fail("Password must be at least 8 characters");
    const p = await db();
    const id = crypto.randomUUID();
    await p.query(
      "INSERT INTO gv_users (id, name, email, password_hash, role, active) VALUES ($1, $2, $3, $4, 'admin', TRUE)",
      [id, name, email, await bcrypt.hash(password, 10)]
    );
    const company = { ...DEFAULT_COMPANY, ...(b.company ?? {}) };
    await setSetting("company", {
      name: String(company.name || "GrowVika").slice(0, 200),
      tagline: String(company.tagline ?? "").slice(0, 200),
      address: String(company.address ?? "").slice(0, 500),
      phone: String(company.phone ?? "").slice(0, 50),
      email: String(company.email ?? "").slice(0, 200),
      gst: String(company.gst ?? "").toUpperCase().slice(0, 20),
      udyam: String(company.udyam ?? "").toUpperCase().trim().slice(0, 40),
    });
    await createSession(id);
    return json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
