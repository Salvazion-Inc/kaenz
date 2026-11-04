import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { csrfOk, isRecoveryToken } from "./session-hash.ts";

const U = "https://kaenz.com/api/auth/session-from-hash";
const req = (h: Record<string, string>) => new Request(U, { method: "POST", headers: h, body: "{}" });
const good = { origin: "https://kaenz.com", "x-kaenz-csrf": "1", "content-type": "application/json" };

test("session-from-hash requires same origin, csrf header and JSON", () => {
  assert.equal(csrfOk(req(good)), true);
  assert.equal(csrfOk(req({ ...good, origin: "https://evil.com" })), false);
  assert.equal(csrfOk(req({ origin: good.origin, "content-type": "application/json" })), false);
  assert.equal(csrfOk(req({ ...good, "content-type": "text/plain" })), false);
});

test("session-from-hash returns 403 before reading the body without csrf", async () => {
  const { POST } = await import("../app/api/auth/session-from-hash/route.ts");
  const res = await POST(req({ "content-type": "application/json" }));
  assert.equal(res.status, 403);
});

const jwt = (p: object) => `x.${Buffer.from(JSON.stringify(p)).toString("base64url")}.y`;

test("only amr recovery goes to reset-password; body.recovery is ignored", () => {
  assert.equal(isRecoveryToken(jwt({ amr: [{ method: "recovery", timestamp: 1 }] })), true);
  assert.equal(isRecoveryToken(jwt({ amr: [{ method: "password" }] })), false);
  assert.equal(isRecoveryToken("garbage"), false);
  const api = fs.readFileSync(new URL("../app/api/auth/session-from-hash/route.ts", import.meta.url), "utf8");
  assert.equal(/body\?\.recovery/.test(api), false);
  const cb = fs.readFileSync(new URL("../app/(site)/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(cb, /x-kaenz-csrf/);
  assert.match(cb, /history\.replaceState\(null, "", location\.pathname\);\s*fetch/);
});

test("Supabase recovery tokens (amr otp) open reset-password only with a fresh recovery_sent_at", async () => {
  const { isRecoverySession } = await import("./session-hash.ts");
  const now = Date.parse("2026-11-04T02:22:00Z");
  const otp = jwt({ amr: [{ method: "otp", timestamp: 1 }] });
  assert.equal(isRecoverySession(otp, "2026-11-04T02:21:30Z", now), true);
  assert.equal(isRecoverySession(otp, "2026-11-04T00:00:00Z", now), false);
  assert.equal(isRecoverySession(otp, null, now), false);
  assert.equal(isRecoverySession(jwt({ amr: [{ method: "password" }] }), "2026-11-04T02:21:30Z", now), false);
  assert.equal(isRecoverySession(jwt({ amr: [{ method: "recovery" }] }), null, now), true);
  const api = fs.readFileSync(new URL("../app/api/auth/session-from-hash/route.ts", import.meta.url), "utf8");
  assert.match(api, /isRecoverySession\(access_token, data\.user\.recovery_sent_at\)/);
});
