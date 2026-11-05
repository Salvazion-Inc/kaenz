/**
 * DEC-20261105-02 (under DEC-20261021-02).
 * Server-only. Trip checkout stays closed unless TRIP_CHECKOUT_ENABLED
 * is exactly "1" or "true". Unset and every other value fail closed.
 * Not a NEXT_PUBLIC_ variable. Production stays unset until #26 has
 * code and production PASS.
 */
export function tripCheckoutEnabled(env: NodeJS.ProcessEnv = process.env) {
  const value = env.TRIP_CHECKOUT_ENABLED;
  return value === "1" || value === "true";
}
