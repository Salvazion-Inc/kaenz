import { NextResponse } from "next/server";
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
import { getSupabase } from "@/lib/supabase";

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

  const id = crypto.randomUUID();
  const account: AccountRecord = {
    id,
    email,
    name,
    hash: hashPassword(password),
  };
  users.push(account);
  if (users.length > 25) users.splice(0, users.length - 25);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
    } catch {
      /* local session still works */
    }
    try {
      await supabase.from("profiles").upsert({ id, full_name: name, role: "client" });
    } catch {
      /* optional */
    }
  }

  const session = await createSessionToken({ id, email, name });
  const vault = await signAccounts(users);
  const res = NextResponse.json({ user: { id, email, name } });
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", accountsCookie(vault));
  return res;
}
