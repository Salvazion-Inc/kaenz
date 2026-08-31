"use client";

import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import {
  clampGratuityPct,
  GRATUITY_MAX_PCT,
  GRATUITY_PCTS,
  gratuityAmount,
} from "@/lib/pricing";
import { formatUsd } from "@/lib/yachts";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export function GratuityPicker({
  locale,
  fare,
  value,
  onChange,
}: {
  locale: Locale;
  fare: number;
  value: number;
  onChange: (pct: number) => void;
}) {
  const c = at(locale);
  const pct = clampGratuityPct(value);
  const preset = (GRATUITY_PCTS as readonly number[]).includes(pct);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-white/60">
        {c.gratuity}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {GRATUITY_PCTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl border px-2 py-2 text-xs font-bold ${
              pct === option
                ? "border-kaenz bg-kaenz/15 text-kaenz"
                : "border-white/10 bg-white/5 text-white/70"
            }`}
          >
            {option === 0 ? c.gratuityNone : `${option}%`}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-white/60">
        {c.gratuityCustom}
        <input
          className={field}
          type="number"
          min={0}
          max={GRATUITY_MAX_PCT}
          step={1}
          value={preset ? "" : pct}
          placeholder={preset ? String(pct) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(0);
              return;
            }
            onChange(clampGratuityPct(Number(raw)));
          }}
        />
      </label>
      <p className="mt-1 text-[11px] text-white/45">{c.gratuityHint}</p>
      {pct ? (
        <p className="mt-1 text-xs text-kaenz">
          {formatUsd(gratuityAmount(fare, pct))} · {pct}%
        </p>
      ) : null}
    </div>
  );
}
