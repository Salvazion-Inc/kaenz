const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(value: string | null | undefined) {
  const email = String(value || "").trim().toLowerCase();
  return EMAIL.test(email) ? email : "";
}

/**
 * Address on /check-email. A fresh signup puts its address in the query and
 * that wins over a session left by a previous account. With neither, the page
 * stays generic.
 */
export function checkEmailAddress(
  sessionEmail?: string | null,
  queryEmail?: string | null,
) {
  const query = normalize(queryEmail);
  if (query) return query;
  return normalize(sessionEmail);
}
