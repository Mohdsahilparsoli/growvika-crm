import { db } from "@/server/db";
import { appUrl, createResetToken, dbError, fail, json } from "@/server/auth";
import { getSmtp, sendMail } from "@/server/email";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!email) return fail("Please enter your email");
    const smtp = await getSmtp();
    if (!smtp.host || !smtp.user || !smtp.pass) {
      return fail("Email sending is not set up, so a reset link cannot be sent. Ask another admin to reset your password from Team & Settings.", 503);
    }
    const p = await db();
    const r = await p.query("SELECT id, name, email, password_hash, active FROM gv_users WHERE LOWER(email) = $1", [email]);
    const u = r.rows[0];
    // Same reply whether or not the account exists, so emails cannot be guessed
    if (u && u.active) {
      const token = await createResetToken(u.id, u.password_hash);
      const link = `${appUrl(req)}/reset?token=${encodeURIComponent(token)}`;
      await sendMail({
        to: u.email,
        subject: "Reset your GrowVika CRM password",
        text: `Hello ${u.name},\n\nWe received a request to reset your GrowVika CRM password. Open this link to choose a new password:\n\n${link}\n\nThe link works once and expires in 30 minutes. If you did not ask for this, you can ignore this email; your password will not change.\n\nGrowVika CRM`,
      });
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Error && /Email|email server|Could not send/.test(e.message)) return fail(e.message, 502);
    return dbError(e);
  }
}
