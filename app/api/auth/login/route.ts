import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/passwords";
import {
  ACCOUNTS_COOKIE,
  cookieValue,
  createSessionToken,
  readAccounts,
  sessionCookie,
} from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "credentials" }, { status: 400 });
  }

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  const local = users.find((u) => u.email === email);
  if (local && verifyPassword(password, local.hash)) {
    const session = await createSessionToken(local);
    const res = NextResponse.json({
      user: { id: local.id, email: local.email, name: local.name },
    });
    res.headers.append("Set-Cookie", sessionCookie(session));
    return res;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      const user = {
        id: data.user.id,
        email: data.user.email || email,
        name:
          String(data.user.user_metadata?.full_name || "") ||
          (data.user.email || email),
      };
      const session = await createSessionToken(user);
      const res = NextResponse.json({ user });
      res.headers.append("Set-Cookie", sessionCookie(session));
      return res;
    }
    } catch {
      /* fall through to 401 */
    }
  }

  return NextResponse.json({ error: "credentials" }, { status: 401 });
}
