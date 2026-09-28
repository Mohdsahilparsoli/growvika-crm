import bcrypt from "bcryptjs";
import { requireUser, json, fail } from "@/server/auth";
import { db } from "@/server/db";
import { handle } from "@/server/data";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const self = id === user.id;
  if (user.role !== "admin" && !self) return fail("Only admins can edit team members", 403);
  try {
    const b = await req.json();
    const p = await db();
    const cur = (await p.query("SELECT id, name, email, role, active FROM gv_users WHERE id = $1", [id])).rows[0];
    if (!cur) return fail("User not found", 404);

    const name = b.name !== undefined ? String(b.name).trim().slice(0, 200) : cur.name;
    const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : cur.email;
    let role = cur.role;
    let active = cur.active;
    if (user.role === "admin" && !self) {
      if (b.role === "admin" || b.role === "employee") role = b.role;
      if (typeof b.active === "boolean") active = b.active;
    }
    if (!name) return fail("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email");
    const clash = await p.query("SELECT 1 FROM gv_users WHERE LOWER(email) = $1 AND id <> $2", [email, id]);
    if (clash.rowCount) return fail("This email is already in use", 409);

    await p.query("UPDATE gv_users SET name = $1, email = $2, role = $3, active = $4 WHERE id = $5", [name, email, role, active, id]);
    if (typeof b.password === "string" && b.password.length > 0) {
      if (b.password.length < 8) return fail("Password must be at least 8 characters");
      await p.query("UPDATE gv_users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(b.password, 10), id]);
    }
    return json({ user: { id, name, email, role, active } });
  } catch (e) {
    return handle(e);
  }
}
