import { getSupabase } from "./supabase";

export const FUNNEL_STEPS = [
  "signup_started",
  "signup_completed",
  "email_verified",
  "listing_started",
  "listing_submitted",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const ROLES = new Set(["owner", "captain", "marina"]);

export function funnelRecord(step: unknown, role?: unknown) {
  if (typeof step !== "string" || !FUNNEL_STEPS.includes(step as FunnelStep)) return null;
  const safeRole = typeof role === "string" && ROLES.has(role) ? role : undefined;
  return {
    event: "kaenz_funnel" as const,
    step: step as FunnelStep,
    at: new Date().toISOString(),
    role: safeRole,
  };
}

/** Console always. Insert is best-effort and ignored when the table is not there yet. */
export function logFunnel(step: unknown, role?: unknown) {
  const row = funnelRecord(step, role);
  if (!row) return;
  console.info(JSON.stringify(row));
  const db = getSupabase();
  if (!db) return;
  void db
    .from("funnel_events")
    .insert({ step: row.step, role: row.role ?? null })
    .then(
      () => undefined,
      () => undefined,
    );
}
