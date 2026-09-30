import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/token";

// Pages you can open without signing in
const PUBLIC = ["/login", "/reset", "/setup"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Always use the main domain (crm.growvika.com) instead of the *.vercel.app address
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "";
  const host = req.headers.get("host") ?? "";
  if (process.env.VERCEL_ENV === "production" && prod && !prod.endsWith(".vercel.app") && host.endsWith(".vercel.app")) {
    return NextResponse.redirect(new URL(pathname + search, `https://${prod}`), 308);
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Checked on the server before the page loads, so there is no flash of the wrong page
  const signedIn = !!(await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value));
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const resetLink = pathname === "/reset" && req.nextUrl.searchParams.has("token");

  if (isPublic && signedIn && !resetLink) return NextResponse.redirect(new URL("/", req.url));
  if (!isPublic && !signedIn) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  // Skip Next.js files, icons, logos and the app manifest
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|logo-white.png|logo-dark.png).*)"],
};
