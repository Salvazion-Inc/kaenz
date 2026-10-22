export function trackFunnel(step: string, role?: string) {
  if (typeof window === "undefined") return;
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role ? { step, role } : { step }),
  }).catch(() => undefined);
}
