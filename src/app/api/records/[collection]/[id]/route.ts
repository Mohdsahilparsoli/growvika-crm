import { requireUser, json } from "@/server/auth";
import { asCollection, handle, removeRecord, updateRecord } from "@/server/data";

type Ctx = { params: Promise<{ collection: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  try {
    const { collection, id } = await ctx.params;
    const record = await updateRecord(user, asCollection(collection), id, await req.json());
    return json({ record });
  } catch (e) {
    return handle(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  try {
    const { collection, id } = await ctx.params;
    await removeRecord(user, asCollection(collection), id);
    return json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
