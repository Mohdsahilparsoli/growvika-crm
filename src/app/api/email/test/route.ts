import { requireUser, json, fail } from "@/server/auth";
import { getSmtp, sendMail } from "@/server/email";

export async function POST() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can send test emails", 403);
  try {
    const c = await getSmtp();
    await sendMail({
      to: c.user,
      subject: "GrowVika CRM – test email",
      text: "This is a test email from GrowVika CRM.\n\nIf you can read this, invoices can now be emailed to your clients.",
    });
    return json({ ok: true, to: c.user });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send", 400);
  }
}
