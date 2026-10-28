import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  LOCALE_COOKIE,
  localeCookieHeader,
  localeFromPath,
  stripLocalePrefix,
} from "@/lib/locale";
import { resolveRequestSession } from "@/lib/account-verification";

const APP_HOSTS = new Set(["app.kaenz.com", "www.app.kaenz.com"]);
const SITE = "https://kaenz.com";
const MAPUCOIN = "https://mapucoin.com";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  // Shared Supabase Site URL is kaenz.com. Mapucoin Google login lands
  // here with ?code= when mapucoin.com is not on the redirect allow-list.
  // Kaenz email confirmation uses /auth/callback and must stay on this host.
  const oauthCode = request.nextUrl.searchParams.get("code");
  if (
    oauthCode &&
    !pathname.startsWith("/api/") &&
    (pathname === "/" ||
      pathname === "/mapucoin-auth" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/app"))
  ) {
    const dest = new URL("/auth/callback", MAPUCOIN);
    dest.search = request.nextUrl.search;
    return applySecurityHeaders(NextResponse.redirect(dest));
  }

  if (host === "www.kaenz.com") {
    const url = request.nextUrl.clone();
    url.host = "kaenz.com";
    url.protocol = "https:";
    return applySecurityHeaders(NextResponse.redirect(url, 308));
  }

  if (APP_HOSTS.has(host)) {
    const dest = pathname.startsWith("/app")
      ? `${SITE}${pathname}${search}`
      : `${SITE}/app${pathname === "/" ? "" : pathname}${search}`;
    return applySecurityHeaders(NextResponse.redirect(dest, 308));
  }

  const prefixed = localeFromPath(pathname);
  if (prefixed) {
    const dest = new URL(stripLocalePrefix(pathname) + search, request.url);
    const res = NextResponse.redirect(dest, 308);
    res.headers.append("Set-Cookie", localeCookieHeader(prefixed));
    return applySecurityHeaders(res);
  }

  // Home does not read cookies. Skip the locale header so the static page
  // is not varied into a no-store response.
  if (pathname === "/") {
    return applySecurityHeaders(NextResponse.next());
  }

  let repairedSession: string | null = null;
  if (pathname.startsWith("/app")) {
    const session = await resolveRequestSession(request.headers.get("cookie"), request);
    if (!session.user) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = `?next=${encodeURIComponent(pathname + search)}`;
      const redirect = NextResponse.redirect(login);
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
      return applySecurityHeaders(redirect);
    }
    repairedSession = session.setCookie;
  }

  const locale = request.cookies.get(LOCALE_COOKIE)?.value;
  const res = NextResponse.next();
  if (repairedSession) res.headers.append("Set-Cookie", repairedSession);
  if (locale) res.headers.set("x-kaenz-locale", locale);
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/mapucoin-auth")
  ) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.png|icon.png|manifest.json|flags/).*)",
  ],
};
