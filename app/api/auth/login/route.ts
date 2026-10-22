import { NextResponse } from "next/server";
import { confirmationSignal } from "@/lib/account-verification";
import { verifyPassword } from "@/lib/passwords";
import {
  ACCOUNTS_COOKIE,
  cookieValue,
  createSessionToken,
  readAccounts,
} from "@/lib/session";
import {
  applyCookies,
  createRouteSupabase,
  setKaenzSessionCookie,
  type PendingCookie,
} from "@/lib/supabase-route";

export const runtime = "nodejs";

const SIGN_IN_MS = 10_000;

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "credentials" }, { status: 400 });
  }

  const pending: PendingCookie[] = [];
  const supabase = createRouteSupabase(req, pending);
  let reachable = false;
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        SIGN_IN_MS,
      );
      reachable = true;
      if (!error && data.user) {
        const user = {
          id: data.user.id,
          email: data.user.email || email,
          name:
            String(data.user.user_metadata?.full_name || "") ||
            (data.user.email || email),
        };
        const verified = confirmationSignal(data.user) !== "unconfirmed";
        const session = await createSessionToken(user);
        const res = NextResponse.json({ user, verified });
        applyCookies(res, pending);
        setKaenzSessionCookie(res, session);
        return res;
      }
      const code = String((error as { code?: string } | null)?.code || "");
      const message = String(error?.message || "");
      if (code === "email_not_confirmed" || /not confirmed/i.test(message)) {
        return NextResponse.json(
          { error: "unverified", message: "Verify your email" },
          { status: 403 },
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === "timeout") {
        return NextResponse.json({ error: "timeout" }, { status: 504 });
      }
      reachable = false;
    }
  }

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  const local = users.find((u) => u.email === email);
  if (local && verifyPassword(password, local.hash) && !(supabase && reachable)) {
    const session = await createSessionToken(local);
    const res = NextResponse.json({
      user: { id: local.id, email: local.email, name: local.name },
    });
    setKaenzSessionCookie(res, session);
    return res;
  }

  return NextResponse.json({ error: "credentials" }, { status: 401 });
}
