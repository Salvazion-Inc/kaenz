import { localeMeta, parseLocale, type Locale } from "@/lib/locale";
import { yachts } from "@/lib/yachts";

export const runtime = "nodejs";

function systemPrompt(locale: Locale) {
  const fleet = yachts
    .map(
      (y) =>
        `${y.name} (${y.class}, ${y.lengthFt} ft, ${y.guests} guests, from $${y.priceFrom}, ${y.marina}) — ${y.blurb.en}`,
    )
    .join("\n");

  return `You are the Kaenz concierge, a South Florida yacht trip planner for the Kaenz marketplace (the Uber of yachts in Miami–Fort Lauderdale).

Brand: Kaenz by Salvazion Inc. Tagline: Skip the traffic. Cruise Miami by Yacht.
Kaenz is a technology platform only. Independent yacht owners and USCG-licensed captains operate trips. Platform fee is 30%; owner 40%; captain 30%.

Signature routes:
- Miami Beach → Brickell: about 18 minutes
- Fort Lauderdale → Hollywood Beach sandbar: about 35 minutes
- Fort Lauderdale → Palm Beach sunset: about 45 minutes

Fleet:
${fleet}

Marinas: Miami Beach Marina, Island Gardens Miami, Las Olas Marina, Hollywood Marina, Palm Beach Town Docks.

Help the guest pick a yacht, pickup marina, destination, duration, and guest count. Be concise, specific, and useful. Never invent live availability or guarantee weather. Suggest booking on the Kaenz site. Reply in ${localeMeta[locale].replyLanguage}.`;
}

export async function POST(req: Request) {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return Response.json({ error: "Missing XAI_API_KEY" }, { status: 500 });
  }

  const body = await req.json();
  const locale = parseLocale(body.locale);
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter(
      (m: { role?: string; content?: string }) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4.6",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt(locale) },
        ...messages,
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    return Response.json(
      { error: errText || "Grok request failed" },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content;
          if (token) controller.enqueue(encoder.encode(token));
        } catch {
          /* ignore malformed SSE lines */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
