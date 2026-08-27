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

/** GoTrue still returns an authorize URL when Google is disabled. */
export async function supabaseGoogleEnabled() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return false;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { external?: Record<string, boolean | string> };
    const google = json.external?.google;
    return google === true || google === "true";
  } catch {
    return false;
  }
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
