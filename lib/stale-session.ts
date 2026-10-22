export type AuthFailure = {
  message?: string | null;
  code?: string | null;
};

/** Supabase rejected the refresh token or the session row is gone. */
export function staleSupabaseAuthError(error: AuthFailure | null | undefined) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  if (!message && !code) return false;
  return (
    code === "session_not_found" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    message.includes("session_not_found") ||
    message.includes("session not found") ||
    message.includes("refresh token") ||
    message.includes("refresh_token")
  );
}

/**
 * A device still holding a Supabase session (or a confirmed Kaenz cookie) whose
 * server session is gone. Network outages are not stale: the cookie stays.
 */
export function shouldClearDeviceSession(input: {
  reachable: boolean;
  live: boolean;
  sbCookiesPresent: boolean;
  confirmed?: boolean;
  error?: AuthFailure | null;
}) {
  if (!input.reachable || input.live) return false;
  if (staleSupabaseAuthError(input.error)) return true;
  if (input.sbCookiesPresent) return true;
  return input.confirmed === true;
}
