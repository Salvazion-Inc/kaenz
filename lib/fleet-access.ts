import type { SessionUser } from "./session";

export function fleetAccess(user: SessionUser | null, verified: boolean) {
  if (!user) return "anon" as const;
  if (!verified) return "unverified" as const;
  return "verified" as const;
}
