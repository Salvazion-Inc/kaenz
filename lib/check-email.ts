const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Address shown on /check-email. A query string is never enough; a session is. */
export function checkEmailAddress(sessionEmail: string | null | undefined) {
  const email = String(sessionEmail || "").trim().toLowerCase();
  return EMAIL.test(email) ? email : "";
}
