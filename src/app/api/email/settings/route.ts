import { requireUser, json, fail } from "@/server/auth";
import { handle } from "@/server/data";
import { publicSmtp, saveSmtp } from "@/server/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can see email settings", 403);
  try {
    return json(await publicSmtp());
  } catch (e) {
    return handle(e);
  }
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (user.role !== "admin") return fail("Only admins can change email settings", 403);
  try {
    await saveSmtp(await req.json());
    return json(await publicSmtp());
  } catch (e) {
    return handle(e);
  }
}
