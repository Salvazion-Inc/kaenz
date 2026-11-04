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

