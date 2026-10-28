import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST as postChat } from "../app/api/chat/route.ts";
import { GET as getStatus } from "../app/api/concierge/status/route.ts";
import { at } from "./app-copy.ts";
import { conciergeEnabled } from "./concierge.ts";
import { copy } from "./copy.ts";

test("concierge stays hidden without a key and returns when one is set", async () => {
  assert.equal(conciergeEnabled({}), false);
  assert.equal(conciergeEnabled({ XAI_API_KEY: "   " }), false);
  assert.equal(conciergeEnabled({ XAI_API_KEY: "present" }), true);

  const previous = process.env.XAI_API_KEY;
  delete process.env.XAI_API_KEY;
  try {
    const status = await getStatus();
    assert.deepEqual(await status.json(), { enabled: false });

    const chat = await postChat(
      new Request("https://kaenz.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale: "en",
          messages: [{ role: "user", content: "Miami Beach to Brickell" }],
        }),
      }),
    );
    assert.equal(chat.status, 503);
    const chatBody = (await chat.json()) as { error?: string };
    assert.deepEqual(chatBody, { error: "concierge_disabled" });
    assert.equal(JSON.stringify(chatBody).includes("XAI"), false);

    process.env.XAI_API_KEY = "unit-test-concierge-secret";
    const on = await getStatus();
    const onBody = await on.json();
    assert.deepEqual(onBody, { enabled: true });
    assert.equal(JSON.stringify(onBody).includes("unit-test-concierge-secret"), false);
  } finally {
    if (previous === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = previous;
  }

  for (const locale of ["en", "es", "fr", "it", "pt"] as const) {
    const soon = copy[locale].conciergeComingSoon;
    assert.ok(soon.length > 8);
    assert.equal(soon.includes("XAI_API_KEY"), false);
    assert.equal(copy[locale].conciergeMissingKey.includes("XAI_API_KEY"), false);
    assert.ok(at(locale).addYacht.confirmDeleteDraft.length > 8);
  }

  const page = readFileSync(new URL("../app/concierge/page.tsx", import.meta.url), "utf8");
  assert.match(page, /conciergeEnabled\(\)/);
  assert.match(page, /redirect\("\/"\)/);
  const nav = readFileSync(new URL("../components/Nav.tsx", import.meta.url), "utf8");
  assert.match(nav, /useConciergeEnabled/);
  assert.match(nav, /href="\/concierge"/);
  const chatSrc = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
  assert.match(chatSrc, /"concierge_disabled"/);
  assert.match(chatSrc, /status: 503/);
  assert.equal(chatSrc.includes("Missing XAI_API_KEY"), false);
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.equal(config.includes('source: "/concierge"'), false);
  const widget = readFileSync(new URL("../components/ConciergeChat.tsx", import.meta.url), "utf8");
  assert.match(widget, /if \(!enabled\) return null/);
  assert.equal(widget.includes("XAI_API_KEY"), false);
  const yachts = readFileSync(new URL("../components/app/YachtsTab.tsx", import.meta.url), "utf8");
  assert.match(yachts, /window\.confirm\(c\.addYacht\.confirmDeleteDraft\)/);
});
