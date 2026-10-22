import { cookieIsSecure, readSignedValue, signValue } from "./session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AGE = 30 * 60;

export const CHECK_EMAIL_COOKIE = "kaenz_check_email";

function normalize(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  return EMAIL.test(email) ? email : "";
}

/**
 * Address on /check-email. Only a signed signup cookie may be shown.
 * A query string or an older session is not displayed.
 */
export function checkEmailAddress(cookieEmail?: string | null) {
  return normalize(cookieEmail);
}

export async function signCheckEmail(email: string) {
  const normalized = normalize(email);
  if (!normalized) return "";
  const token = await signValue(
    JSON.stringify({
      email: normalized,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    }),
  );
  const secure = cookieIsSecure() ? "; Secure" : "";
  return `${CHECK_EMAIL_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export async function readCheckEmail(token: string | null | undefined) {
  const raw = await readSignedValue(token);
  if (!raw) return "";
  try {
    const data = JSON.parse(raw) as { email?: string; exp?: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return "";
    return checkEmailAddress(data.email);
  } catch {
    return "";
  }
}
