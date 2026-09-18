const PUBLIC_CODES = new Set([
  "yacht",
  "kind",
  "profile",
  "stripe_unconfigured",
  "rate",
  "checkout",
  "session",
  "fields",
  "auth",
]);

const SECRETISH =
  /sk_live|sk_test|rk_live|rk_test|whsec_|service_role|stripe secret|stack|at\s+\S+\s+\(/i;

export function publicErrorCode(code: unknown) {
  const value = String(code || "error").slice(0, 64);
  if (SECRETISH.test(value)) return "error";
  if (PUBLIC_CODES.has(value)) return value;
  return "error";
}
