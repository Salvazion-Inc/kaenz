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
  googleFailUrl,
  parseAuthFrom,
  publicOrigin,
  readOauthState,
  safeNext,
  type AuthFrom,
  type GoogleFailReason,
} from "@/lib/google-oauth";
import { ensureSupabaseUser } from "@/lib/supabase";
import {
  applyCookies,
  createRouteSupabase,
} from "@/lib/supabase-route";

export const runtime = "nodejs";

function fail(
  req: Request,
  opts: { next: string; from: AuthFrom; reason: GoogleFailReason },
) {
  const res = NextResponse.redirect(googleFailUrl(req, opts));
  res.headers.append("Set-Cookie", clearOauthStateCookie());
  return res;
}

function dest(req: Request, next: string) {
  return new URL(safeNext(next), publicOrigin(req));
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

async function supabaseFromIdToken(
  req: Request,
  opts: { idToken: string; accessToken: string; nonce: string },
) {
  const pending: Parameters<typeof applyCookies>[1] = [];
  const supabase = createRouteSupabase(req, pending);
  if (!supabase) return { user: null, pending };
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: opts.idToken,
    access_token: opts.accessToken,
    nonce: opts.nonce,
  });
  if (error || !data.user?.email) return { user: null, pending };
  const email = data.user.email.toLowerCase();
  const name =
    String(
      data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
    ) || email;
  return {
    user: { id: data.user.id, email, name },
    pending,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const googleError = url.searchParams.get("error");
  const nonce = url.searchParams.get("state");
  const state = await readOauthState(
    cookieValue(req.headers.get("cookie"), OAUTH_STATE_COOKIE),
  );
  const next = safeNext(state?.next || url.searchParams.get("next"));
  const from = parseAuthFrom(state?.from);

  if (googleError === "access_denied" || googleError === "user_cancelled") {
    return fail(req, { next, from, reason: "denied" });
  }

  if (!code || !nonce || !state || nonce !== state.nonce) {
    return fail(req, { next, from, reason: "failed" });
  }

  let exchanged;
  try {
    exchanged = await exchangeGoogleCode({
      code,
      verifier: state.verifier,
      callback: googleCallbackUrl(req),
    });
  } catch {
    return fail(req, { next, from, reason: "failed" });
  }
  if (!exchanged) return fail(req, { next, from, reason: "failed" });

  let user = {
    id: `google:${exchanged.profile.sub}`,
    email: exchanged.profile.email,
    name: exchanged.profile.name,
  };
  let pending: Parameters<typeof applyCookies>[1] = [];

  if (exchanged.idToken) {
    try {
      const linked = await supabaseFromIdToken(req, {
        idToken: exchanged.idToken,
        accessToken: exchanged.accessToken,
        nonce: state.nonce,
      });
      pending = linked.pending;
      if (linked.user) user = linked.user;
    } catch {
      /* Kaenz session still succeeds via ensureSupabaseUser */
    }
  }

  const res = applyCookies(NextResponse.redirect(dest(req, next)), pending);
  return finishLogin(req, res, user);
}
