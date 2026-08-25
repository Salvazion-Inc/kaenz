"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";

type Msg = { role: "user" | "assistant"; content: string };

export function ConciergeChat({ locale }: { locale: Locale }) {
  const c = t(locale);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: t(locale).conciergeHello,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, locale }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Chat failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: snapshot };
          return copy;
        });
      }
    } catch (err) {
      const fallback =
        err instanceof Error && err.message.includes("XAI")
          ? c.conciergeMissingKey
          : c.conciergeUnavailable;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: fallback };
        return copy;
      });
    } finally {
      setBusy(false);
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-kaenz text-white"
                : "bg-white text-navy"
            }`}
          >
            {m.content || (busy ? "…" : "")}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={send}
        className="flex gap-2 border-t border-white/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.conciergePlaceholder}
          className="flex-1 rounded-lg bg-white px-4 py-3 text-navy outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-kaenz px-5 font-bold text-white disabled:opacity-50"
        >
          {c.conciergeSend}
        </button>
      </form>
    </div>
  );
}
