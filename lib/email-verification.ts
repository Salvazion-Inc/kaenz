import { createClient } from "@supabase/supabase-js";
import { confirmationSignal } from "./account-verification";
import { getSupabaseAdmin } from "./supabase";

/** Anon key is the Auth API that sends Supabase's signup confirmation. It is not a data fallback. */
export function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function registerUnconfirmedUser(opts: {
  email: string;
  password: string;
  name: string;
  redirectTo: string;
}): Promise<
  | { ok: true; id: string; confirmed: boolean }
  | { ok: false; error: "exists" | "send" | "unconfigured" }
> {
  const auth = getAuthClient();
  const admin = getSupabaseAdmin();
  if (!auth || !admin) return { ok: false, error: "unconfigured" };

  const { data, error } = await auth.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: { full_name: opts.name },
      emailRedirectTo: opts.redirectTo,
    },
  });
  if (error) {
    const code = String((error as { code?: string }).code || "");
    const msg = `${error.message} ${code}`.toLowerCase();
    if (
      msg.includes("already") ||
      code === "user_already_exists" ||
      error.status === 422
    ) {
      return { ok: false, error: "exists" };
    }
    console.error("Kaenz: signup verification email was not sent.");
    return { ok: false, error: "send" };
  }

  const user = data.user;
  if (!user?.id) return { ok: false, error: "send" };
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return { ok: false, error: "exists" };
  }

  const confirmed = confirmationSignal(user) === "confirmed";
  if (confirmed) {
    console.error(
      "Kaenz: Supabase confirmed the new account immediately. Turn on Auth → Confirm email so signup stays unverified until the link is opened.",
    );
  }

  await admin
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: opts.name,
      email: opts.email,
      role: "client",
    })
    .then(() => undefined, () => undefined);

  return { ok: true, id: user.id, confirmed };
}

export async function resendSignupVerification(email: string, redirectTo: string) {
  const auth = getAuthClient();
  if (!auth) return "unconfigured" as const;
  const { error } = await auth.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error("Kaenz: could not resend the signup verification email.");
    return "failed" as const;
  }
  return "sent" as const;
}
