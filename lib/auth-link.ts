const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;

export type EmailOtpType = (typeof OTP_TYPES)[number];

const GENERIC_RESET =
  "If an account exists for that email, we sent a reset link.";

export function passwordResetMessage() {
  return GENERIC_RESET;
}

/** Recovery mail returns to this host, then the callback sends the browser to set a password. */
export function passwordResetRedirect(origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=/reset-password`;
}

export function emailOtpType(value: unknown): EmailOtpType | null {
  const type = String(value || "").trim().toLowerCase();
  return OTP_TYPES.includes(type as EmailOtpType) ? (type as EmailOtpType) : null;
}

/**
 * Supabase puts a bad confirmation link in the query or the hash
 * (`error` / `error_code`, for example `otp_expired`). Our own `error=google`
 * is not one of those links.
 */
export function verificationLinkExpired(params: URLSearchParams) {
  const code = params.get("error_code")?.trim().toLowerCase() || "";
  const error = params.get("error")?.trim().toLowerCase() || "";
  if (code) return true;
  if (!error || error === "google") return false;
  return error === "access_denied" || error === "otp_expired" || error.includes("expired");
}

export function verificationLinkExpiredFromLocation(search: string, hash: string) {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  if (verificationLinkExpired(query)) return true;
  const hashed = new URLSearchParams(hash.replace(/^#/, ""));
  return verificationLinkExpired(hashed);
}

export const EMAIL_VERIFIED_SIGN_IN = "Email verified — please sign in";

export const RESET_PASSWORD_ERROR = "Could not update the password. Request a new link.";
