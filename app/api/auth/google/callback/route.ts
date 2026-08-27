import { NextResponse } from "next/server";
import {
  ACCOUNTS_COOKIE,
  accountsCookie,
  cookieValue,
  createSessionToken,
  readAccounts,
  sessionCookie,
  signAccounts,
  type AccountRecord,
} from "@/lib/session";
import {
  OAUTH_STATE_COOKIE,
  clearOauthStateCookie,
  exchangeGoogleCode,
  googleCallbackUrl,
  GOOGLE_MARKER,
  readOauthState,
  safeNext,
} from "@/lib/google-oauth";
import { ensureSupabaseUser } from "@/lib/supabase";
import {
  applyCookies,
  createRouteSupabase,
  supabaseConfigured,
} from "@/lib/supabase-route";

export const runtime = "nodejs";

function fail(req: Request, next: string) {
  const res = NextResponse.redirect(
    new URL(`/login?error=google&next=${encodeURIComponent(next)}`, req.url),
  );
  res.headers.append("Set-Cookie", clearOauthStateCookie());
  return res;
}

function dest(req: Request, next: string) {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") || url.host).split(",")[0].trim();
  if (host.includes("localhost") || host.startsWith("127.")) {
    return new URL(next, url.origin);
  }
  return new URL(next, "https://kaenz.com");
}

async function finishLogin(
  req: Request,
  res: NextResponse,
  user: { id: string; email: string; name: string },
) {
  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  let account = users.find((u) => u.email === user.email);
  if (!account) {
    account = {
      id: user.id,
      email: user.email,
      name: user.name,
      hash: GOOGLE_MARKER,
    } satisfies AccountRecord;
    users.push(account);
    if (users.length > 25) users.splice(0, users.length - 25);
  } else if (!account.name || account.name === account.email) {
    account.name = user.name;
  }
  const saved = await ensureSupabaseUser(account.email, account.name);
  if (saved) {
    account.id = saved.id;
    account.name = saved.name || account.name;
  }
  const session = await createSessionToken({
    id: account.id,
    email: account.email,
    name: account.name,
  });
  const vault = await signAccounts(users);
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", accountsCookie(vault));
  res.headers.append("Set-Cookie", clearOauthStateCookie());
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (supabaseConfigured() && code) {
    try {
      const pending: Parameters<typeof applyCookies>[1] = [];
      const supabase = createRouteSupabase(req, pending);
      if (supabase) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.user?.email) {
          const email = data.user.email.toLowerCase();
          const name =
            String(
              data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                "",
            ) || email;
          const res = applyCookies(NextResponse.redirect(dest(req, next)), pending);
          return finishLogin(req, res, { id: data.user.id, email, name });
        }
      }
    } catch {
      /* native Google OAuth below */
    }
  }

  const nonce = url.searchParams.get("state");
  const state = await readOauthState(
    cookieValue(req.headers.get("cookie"), OAUTH_STATE_COOKIE),
  );
  const nativeNext = safeNext(state?.next || next);
  if (!code || !nonce || !state || nonce !== state.nonce) {
    return fail(req, nativeNext);
  }

  let profile;
  try {
    profile = await exchangeGoogleCode({
      code,
      verifier: state.verifier,
      callback: googleCallbackUrl(req),
    });
  } catch {
    return fail(req, nativeNext);
  }
  if (!profile) return fail(req, nativeNext);

  return finishLogin(
    req,
    NextResponse.redirect(dest(req, nativeNext)),
    {
      id: `google:${profile.sub}`,
      email: profile.email,
      name: profile.name,
    },
  );
}
