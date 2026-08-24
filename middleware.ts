import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_HOSTS = new Set(["app.kaenz.com", "www.app.kaenz.com"]);
const SITE = "https://kaenz.com";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  if (host === "www.kaenz.com") {
    const url = request.nextUrl.clone();
    url.host = "kaenz.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (APP_HOSTS.has(host)) {
    const dest = pathname.startsWith("/es")
      ? `${SITE}/es/app${pathname.replace(/^\/es/, "").replace(/^\/app/, "") || ""}`
      : pathname.startsWith("/app")
        ? `${SITE}${pathname}${search}`
        : `${SITE}/app${pathname === "/" ? "" : pathname}${search}`;
    return NextResponse.redirect(dest, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|icon.png|manifest.json).*)"],
};
