import { NextResponse } from "next/server";
import { emailConfirmRedirect, registerUnconfirmedUser } from "@/lib/email-verification";
import { applyCookies, createRouteSupabase, type PendingCookie } from "@/lib/supabase-route";
import { hashPassword } from "@/lib/passwords";
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

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.full_name || "").trim();
  const password = String(body.password || "");
  if (!name) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password" }, { status: 400 });
  }

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  if (users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  const pending: PendingCookie[] = [];
  const registered = await registerUnconfirmedUser({
    email,
    password,
    name,
    redirectTo: emailConfirmRedirect(req),
    auth: createRouteSupabase(req, pending),
  });
  if (!registered.ok) {
    const status = registered.error === "exists" ? 409 : registered.error === "unconfigured" ? 503 : 502;
    return NextResponse.json({ error: registered.error }, { status });
  }

  const account: AccountRecord = {
    id: registered.id,
    email,
    name,
    hash: hashPassword(password),
  };
  users.push(account);
  if (users.length > 25) users.splice(0, users.length - 25);

  const session = await createSessionToken({ id: registered.id, email, name });
  const vault = await signAccounts(users);
  const res = NextResponse.json({
    user: { id: registered.id, email, name },
    verified: registered.confirmed,
  });
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", accountsCookie(vault));
  applyCookies(res, pending);
  return res;
}
