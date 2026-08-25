import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

type PendingCookie = {
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
