// Session token helpers with no database access, so the proxy can use them too.
import { jwtVerify } from "jose";
import { createHash } from "crypto";

export const SESSION_COOKIE = "gv_session";

export function sessionSecret() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const raw = process.env.AUTH_SECRET || createHash("sha256").update("growvika:" + dbUrl).digest("hex");
  return new TextEncoder().encode(raw);
}

// Returns the user id if the session cookie is valid (signature + expiry), else null
export async function verifySessionToken(token?: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.purpose || typeof payload.sub !== "string") return null; // not a reset token
    return payload.sub;
  } catch {
    return null;
  }
}
