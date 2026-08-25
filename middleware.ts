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
    const prefixed = pathname.match(/^\/(es|fr|it)(?=\/|$)/);
    let dest: string;
    if (prefixed) {
      const rest =
        pathname.slice(prefixed[0].length).replace(/^\/app/, "") || "";
      dest = `${SITE}/${prefixed[1]}/app${rest}${search}`;
    } else if (pathname.startsWith("/app")) {
      dest = `${SITE}${pathname}${search}`;
    } else {
      dest = `${SITE}/app${pathname === "/" ? "" : pathname}${search}`;
    }
    return NextResponse.redirect(dest, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|icon.png|manifest.json).*)"],
};
