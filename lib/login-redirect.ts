/** Same-origin path from `?next=`. Anything else opens /app. */
export function loginRedirectPath(next: string | null | undefined) {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\") &&
    !next.includes("://")
  ) {
    return next;
  }
  return "/app";
}
