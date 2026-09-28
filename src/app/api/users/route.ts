import bcrypt from "bcryptjs";
import { requireUser, json, fail } from "@/server/auth";
import { db } from "@/server/db";
import { handle } from "@/server/data";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can add team members", 403);
  try {
    const b = await req.json();
    const name = String(b.name ?? "").trim().slice(0, 200);
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const role = b.role === "admin" ? "admin" : "employee";
    if (!name) return fail("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email");
    if (password.length < 8) return fail("Password must be at least 8 characters");
    const p = await db();
    const exists = await p.query("SELECT 1 FROM gv_users WHERE LOWER(email) = $1", [email]);
    if (exists.rowCount) return fail("This email is already in use", 409);
    const id = typeof b.id === "string" && b.id ? b.id.slice(0, 100) : crypto.randomUUID();
    await p.query(
      "INSERT INTO gv_users (id, name, email, password_hash, role, active) VALUES ($1, $2, $3, $4, $5, TRUE)",
      [id, name, email, await bcrypt.hash(password, 10), role]
    );
    return json({ user: { id, name, email, role, active: true } }, 201);
  } catch (e) {
    return handle(e);
  }
}
