import { requireUser } from "@/server/auth";
import { getSetting } from "@/server/db";

// Signature image for invoices. The URL carries a version (?v=...), so the
// browser can keep it cached and only download it again after it changes.
export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const c = await getSetting<{ signature?: string }>("company", {});
  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(c.signature ?? "");
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
