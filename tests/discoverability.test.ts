import assert from "node:assert/strict";
import { test } from "node:test";
import { aiJson, aiTxt, robotsTxt } from "../lib/discoverability";

test("kaenz robots opens public pages to search and AI use", () => {
  const body = robotsTxt();
  const agents = body.match(/^User-agent: /gm) || [];
  const signals =
    body.match(/^Content-Signal: search=yes, ai-input=yes, ai-train=yes$/gm) || [];
  assert.equal(signals.length, agents.length);
  assert.ok(agents.length > 20);
  for (const token of [
    "Googlebot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "Google-Extended",
  ]) {
    assert.match(body, new RegExp(`^User-agent: ${token}$`, "m"));
  }
  assert.equal(body.includes("\nDisallow: /\n"), false);
  assert.match(body, /^Disallow: \/api\/$/m);
  assert.match(body, /^Disallow: \/app\/$/m);
  assert.match(body, /^Sitemap: https:\/\/kaenz\.com\/sitemap\.xml$/m);
});

test("kaenz ai policy allows citation and keeps the app private", () => {
  const text = aiTxt();
  assert.match(text, /^Training: conditional$/m);
  assert.match(text, /^Indexing: allow$/m);
  assert.match(text, /^Training-Deny: \/app\/\*$/m);
  assert.match(text, /^Attribution: recommended$/m);
  const json = JSON.parse(aiJson()) as {
    policies: { indexing: string; training: string };
    site: { url: string };
  };
  assert.equal(json.site.url, "https://kaenz.com");
  assert.equal(json.policies.indexing, "allow");
  assert.equal(json.policies.training, "conditional");
});
