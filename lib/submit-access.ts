/** Parse `/api/auth/me` without assuming a JSON content type. */
export function readAccountAccess(body: string) {
  try {
    const data = JSON.parse(body) as { user?: unknown; verified?: unknown };
    const user = Boolean(data && typeof data === "object" && data.user);
    return { user, verified: user && data.verified !== false };
  } catch {
    return { user: false, verified: false };
  }
}

export async function fetchAccountAccess() {
  try {
    const res = await fetch("/api/auth/me");
    return readAccountAccess(await res.text());
  } catch {
    return null;
  }
}
