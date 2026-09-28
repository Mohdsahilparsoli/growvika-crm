import { requireUser, json } from "@/server/auth";
import { handle, snapshot } from "@/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  try {
    return json({ user, db: await snapshot(user) });
  } catch (e) {
    return handle(e);
  }
}
