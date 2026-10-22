/**
 * Files crawlers and answer engines actually fetch.
 * Public pages are open for search, AI answers, and training.
 * The signed-in app and API stay closed.
 * A named User-agent does not inherit rules from User-agent: *,
 * so every group repeats Allow, Disallow, and Content-Signal.
 */

export const SITE = "https://kaenz.com";

export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

export const NAMED_AGENTS = [
  "Googlebot",
  "Googlebot-Image",
  "Googlebot-News",
  "Googlebot-Video",
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "Bingbot",
  "DuckDuckBot",
  "DuckAssistBot",
  "Applebot",
  "Applebot-Extended",
  "YandexBot",
  "Slurp",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Amazonbot",
  "YouBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  "CCBot",
  "Bytespider",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "MistralAI-User",
  "PetalBot",
] as const;

const PRIVATE_PATHS = ["/api/", "/app/", "/mapucoin-auth"];

const TRAINING_DENY = ["/api/*", "/app/*", "/mapucoin-auth*"];

export const DISCOVERY_HEADERS: { key: string; value: string }[] = [
  { key: "tdm-reservation", value: "0" },
  {
    key: "Link",
    value: [
      '</llms.txt>; rel="alternate"; type="text/markdown"',
      '</llms-full.txt>; rel="alternate"; type="text/markdown"',
      '</.well-known/ai.txt>; rel="describedby"; type="text/plain"',
      '</.well-known/ai.json>; rel="describedby"; type="application/json"',
    ].join(", "),
  },
];

const POLICY = `# Content Signals
# search: index this site and show links and short excerpts.
# ai-input: use public pages as input when answering (retrieval and grounding).
# ai-train: use public pages to train or fine-tune models.
# Private paths stay disallowed for every agent.`;

function group(agent: string): string {
  return [
    `User-agent: ${agent}`,
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function robotsTxt(): string {
  const groups = [...NAMED_AGENTS, "*"].map((agent) => group(agent));
  return `${POLICY}

${groups.join("\n\n")}

Sitemap: ${SITE}/sitemap.xml
Host: ${SITE}
`;
}

export function aiTxt(): string {
  return `# ai.txt — AI usage preferences
# Public pages agree with robots.txt Content-Signal: ${CONTENT_SIGNAL}
Spec-Version: 1.0
Site-Name: Kaenz
Site-URL: ${SITE}
Description: Skip the traffic. Travel by yacht. Kaenz is an end-to-end platform for Commute, Tour, and Special Occasion yacht trips in marinas and ports worldwide. Independent owners, captains, and marinas run each trip.
Contact: info@salvazion.org
Policy-URL: ${SITE}/llms.txt
AI-JSON: ${SITE}/.well-known/ai.json

Training: conditional
Scraping: allow
Indexing: allow
Caching: allow

Training-Allow: /
${TRAINING_DENY.map((path) => `Training-Deny: ${path}`).join("\n")}

Attribution: recommended
AI-Disclosure: recommended

Agent: *
  Scraping: allow
  Indexing: allow
  Caching: allow
`;
}

export function aiJson(): string {
  return JSON.stringify(
    {
      specVersion: "1.0",
      site: {
        name: "Kaenz",
        url: SITE,
        description:
          "Skip the traffic. Travel by yacht. End-to-end platform for Commute, Tour, and Special Occasion.",
        contact: "info@salvazion.org",
      },
      policies: {
        training: "conditional",
        scraping: "allow",
        indexing: "allow",
        caching: "allow",
      },
      trainingAllow: ["/"],
      trainingDeny: TRAINING_DENY,
      attribution: "recommended",
      aiDisclosure: "recommended",
      agents: {
        "*": {
          scraping: "allow",
          indexing: "allow",
          caching: "allow",
        },
      },
      links: {
        llms: `${SITE}/llms.txt`,
        llmsFull: `${SITE}/llms-full.txt`,
        robots: `${SITE}/robots.txt`,
        sitemap: `${SITE}/sitemap.xml`,
        instagram: "https://www.instagram.com/kaenz_yachts/",
      },
    },
    null,
    2,
  );
}

export function textFile(body: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
