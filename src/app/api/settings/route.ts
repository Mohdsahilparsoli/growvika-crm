import { requireUser, json, fail } from "@/server/auth";
import { getSetting, setSetting } from "@/server/db";
import { handle } from "@/server/data";
import { DEFAULT_SETTINGS, normalizePlans } from "@/lib/defaults";
import { Settings } from "@/lib/types";

const list = (v: unknown, fallback: string[]) =>
  Array.isArray(v) ? Array.from(new Set(v.map((x) => String(x).trim().slice(0, 100)).filter(Boolean))) : fallback;

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can change settings", 403);
  try {
    const b = await req.json();
    if (b.company) {
      const c = b.company;
      const cur = await getSetting<{ signature?: string }>("company", {});
      // "/api/signature?v=..." means the signature was not changed
      const sig = typeof c.signature === "string" && !c.signature.startsWith("/api/signature") ? c.signature : cur.signature ?? "";
      const validSig = sig === "" || (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig) && sig.length <= 600_000);
      if (!validSig) return fail("Signature image is too large or not a PNG/JPG", 400);
      await setSetting("company", {
        name: String(c.name ?? "").trim().slice(0, 200) || "GrowVika",
        tagline: String(c.tagline ?? "").slice(0, 200),
        address: String(c.address ?? "").slice(0, 500),
        phone: String(c.phone ?? "").slice(0, 50),
        email: String(c.email ?? "").slice(0, 200),
        gst: String(c.gst ?? "").toUpperCase().slice(0, 20),
        udyam: String(c.udyam ?? "").toUpperCase().trim().slice(0, 40),
        signature: sig,
      });
    }
    if (b.settings) {
      const cur = await getSetting<Settings>("settings", DEFAULT_SETTINGS);
      const s = b.settings;
      const rate = Number(s.gstRate);
      await setSetting("settings", {
        services: list(s.services, cur.services),
        plans: Array.isArray(s.plans) ? normalizePlans(s.plans) : normalizePlans(cur.plans),
        leadSources: list(s.leadSources, cur.leadSources),
        expenseCategories: list(s.expenseCategories, cur.expenseCategories),
        invoicePrefix: typeof s.invoicePrefix === "string" ? s.invoicePrefix.trim().slice(0, 20) : cur.invoicePrefix,
        gstRate: Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : cur.gstRate,
        sacCode: typeof s.sacCode === "string" ? s.sacCode.trim().slice(0, 20) : cur.sacCode,
      });
    }
    return json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
