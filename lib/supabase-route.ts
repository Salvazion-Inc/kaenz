import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookieIsSecure, SESSION_COOKIE } from "./session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createRouteSupabase(req: Request, pending: PendingCookie[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        const header = req.headers.get("cookie") || "";
        return header
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const eq = part.indexOf("=");
            const name = eq === -1 ? part : part.slice(0, eq);
            const value = eq === -1 ? "" : part.slice(eq + 1);
            try {
              return { name, value: decodeURIComponent(value) };
            } catch {
              return { name, value };
            }
          });
      },
      setAll(cookiesToSet) {
        pending.push(...cookiesToSet);
      },
    },
  });
}

export function applyCookies(res: NextResponse, pending: PendingCookie[]) {
  for (const { name, value, options } of pending) {
    res.cookies.set(name, value, options);
  }
  return res;
}

/**
 * Write kaenz_session through the response cookie jar after Supabase cookies.
 * NextResponse.cookies.set replaces every Set-Cookie header from its jar, so a
 * header appended before that call is dropped and later routes only see sb-*.
 */
export function setKaenzSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    secure: cookieIsSecure(),
  });
  return res;
}
