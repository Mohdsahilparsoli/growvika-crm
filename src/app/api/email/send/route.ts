import { requireUser, json, fail } from "@/server/auth";
import { sendMail } from "@/server/email";

export const maxDuration = 30;

const isEmail = (v: string) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(v);

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can email invoices", 403);
  try {
    const b = await req.json();
    const to = String(b.to ?? "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    const cc = String(b.cc ?? "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    if (!to.length || !to.every(isEmail)) return fail("Enter a valid client email address");
    if (cc.length && !cc.every(isEmail)) return fail("CC has an invalid email address");
    const subject = String(b.subject ?? "").trim().slice(0, 300);
    const text = String(b.text ?? "").slice(0, 20000);
    if (!subject) return fail("Enter a subject");
    const attachments = Array.isArray(b.attachments)
      ? b.attachments.slice(0, 3).map((a: { filename?: string; base64?: string }) => ({
          filename: String(a.filename ?? "invoice.pdf").replace(/[^\w.\- ]/g, "").slice(0, 120) || "invoice.pdf",
          base64: String(a.base64 ?? ""),
        }))
      : [];
    if (attachments.some((a: { base64: string }) => a.base64.length > 6_000_000)) return fail("Attachment is too large");
    await sendMail({ to: to.join(", "), cc: cc.join(", "), subject, text, attachments });
    return json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send", 400);
  }
}
