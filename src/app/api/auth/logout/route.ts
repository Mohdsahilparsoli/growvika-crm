import { clearSession, json } from "@/server/auth";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
