/** Login-CSRF guard: same origin, custom header, JSON only. */
export function csrfOk(req: Request) {
  const origin = req.headers.get("origin") || "";
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  return (
    origin === new URL(req.url).origin &&
    req.headers.get("x-kaenz-csrf") === "1" &&
    ct === "application/json"
  );
}

/** True only when the access token's amr lists method "recovery". */
export function isRecoveryToken(token: string) {
  try {
    const part = token.split(".")[1] || "";
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      amr?: Array<{ method?: string } | string>;
    };
    return Array.isArray(json.amr) && json.amr.some((m) => (typeof m === "string" ? m : m?.method) === "recovery");
  } catch {
    return false;
  }
}


/** Methods in the access token's amr claim. */
export function tokenAmrMethods(token: string): string[] {
  try {
    const part = token.split(".")[1] || "";
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      amr?: Array<{ method?: string } | string>;
    };
    return Array.isArray(json.amr)
      ? json.amr.map((m) => String(typeof m === "string" ? m : m?.method || ""))
      : [];
  } catch {
    return [];
  }
}

const RECOVERY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Supabase stamps a recovery verify as amr "otp", not "recovery". Treat the
 * session as a recovery only when the token is amr recovery, or amr otp and
 * Supabase itself (server-side user record) sent a recovery mail in the last
 * hour. Nothing from the request body is trusted.
 */
export function isRecoverySession(token: string, recoverySentAt: string | null | undefined, now = Date.now()) {
  const methods = tokenAmrMethods(token);
  if (methods.includes("recovery")) return true;
  if (!methods.includes("otp") || !recoverySentAt) return false;
  const sent = Date.parse(recoverySentAt);
  return Number.isFinite(sent) && now - sent >= 0 && now - sent <= RECOVERY_WINDOW_MS;
}
