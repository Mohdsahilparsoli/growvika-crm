import { clearSession, json } from "@/server/auth";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}

// Used when a session is no longer valid (e.g. account deactivated): clear it and go to sign in
export async function GET(req: Request) {
  await clearSession();
  return Response.redirect(new URL("/login", req.url), 303);
}
