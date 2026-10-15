/** Safe in-app return path. Rejects protocol-relative and off-site values. */
export function safeNextPath(value: string | null | undefined) {
  if (!value) return "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/app";
  return value;
}

export function loginUrl(nextPath: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}

/**
 * Paths that must send an anonymous visitor to login before any app UI,
 * including the yacht, marina, and trip-request screens.
 * `search` may be "" or start with "?".
 */
export function sessionGateNext(pathname: string, search = "") {
  if (!pathname.startsWith("/app")) return null;
  const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `${pathname}${query}`;
}
