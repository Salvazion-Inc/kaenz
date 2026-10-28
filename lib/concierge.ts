/** True only when the server has a concierge key. The value itself is never returned. */
export function conciergeEnabled(env: NodeJS.ProcessEnv = process.env) {
  const key = env.XAI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}
