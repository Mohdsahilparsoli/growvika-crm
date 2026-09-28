import { requireUser, json } from "@/server/auth";
import { asCollection, createRecord, handle } from "@/server/data";

export async function POST(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  try {
    const { collection } = await ctx.params;
    const record = await createRecord(user, asCollection(collection), await req.json());
    return json({ record }, 201);
  } catch (e) {
    return handle(e);
  }
}
