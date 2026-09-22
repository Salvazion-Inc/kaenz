"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/locale";
import { mapHubs, placeById, placeCountry } from "@/lib/places";
import {
  clampHours,
  defaultHoursFor,
  estimateFare,
  HOURS_RANGE,
  type TripKind,
} from "@/lib/pricing";
import { formatUsd, yachtById, yachts } from "@/lib/yachts";

function HubPicker({
  label,
  locale,
  valueId,
  onChange,
}: {
  label: string;
  locale: Locale;
  valueId: string;
  onChange: (id: string) => void;
}) {
  const selected = mapHubs.find((hub) => hub.id === valueId);
  const selectedLabel = selected
    ? `${selected.name} — ${selected.city}, ${placeCountry(selected, locale)}`
    : "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || q === selectedLabel.toLowerCase()) return [];
    const hits = [];
    for (const hub of mapHubs) {
      const hay =
        `${hub.name} ${hub.city} ${hub.country || ""} ${placeCountry(hub, locale)}`.toLowerCase();
      if (!hay.includes(q)) continue;
      hits.push(hub);
      if (hits.length >= 12) break;
    }
    return hits;
  }, [locale, query, selectedLabel]);

  return (
    <div ref={root} className="relative">
      <label className="block text-sm font-semibold">
        {label}
        <input
          className="mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
            setOpen(true);
          }}
          onBlur={() => {
            if (selected) setQuery(selectedLabel);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && suggestions.length ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-navy/10 bg-white py-1 text-navy shadow-xl"
        >
          {suggestions.map((hub) => (
            <li key={hub.id} role="option">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-kaenz/10"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(hub.id);
                  setQuery(
                    `${hub.name} — ${hub.city}, ${placeCountry(hub, locale)}`,
                  );
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-semibold">{hub.name}</span>
                <span className="block text-[11px] text-navy/55">
                  {hub.city}, {placeCountry(hub, locale)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function BookForm({
  locale,
  defaultYacht,
}: {
  locale: Locale;
  defaultYacht?: string;
}) {
  const c = t(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<TripKind>("tour");
  const [yachtId, setYachtId] = useState(defaultYacht || yachts[0].id);
  const [hours, setHours] = useState(HOURS_RANGE.tour.default);
  const [guests, setGuests] = useState(4);
  const [date, setDate] = useState("");
  const [originId, setOriginId] = useState(mapHubs[0]?.id || "");
  const [destinationId, setDestinationId] = useState(
    mapHubs[1]?.id || mapHubs[0]?.id || "",
  );

  const quote = useMemo(() => {
    const yacht = yachtById(yachtId);
    if (!yacht) return null;
    return estimateFare(yacht, kind, {
      hours,
      guests,
      date,
      origin: placeById(originId),
      destination: placeById(destinationId),
    });
  }, [yachtId, kind, hours, guests, date, originId, destinationId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setStatus("ok");
      setMessage(c.form.success);
      e.currentTarget.reset();
    } catch {
      setStatus("err");
      setMessage(c.formError);
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-navy/15 bg-white px-4 py-3 text-navy outline-none focus:border-kaenz";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white p-6 text-navy shadow-xl md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          {c.form.name}
          <input className={field} name="full_name" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.email}
          <input className={field} type="email" name="email" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.phone}
          <input className={field} name="phone" type="tel" />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.kind}
          <select
            className={field}
            name="trip_kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as TripKind;
              setKind(next);
              setHours(defaultHoursFor(next));
            }}
          >
            {(["commute", "tour", "special"] as const).map((k, i) => (
              <option key={k} value={k}>
                {c.tripTypes[i].title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {c.form.duration}
          <input
            className={field}
            type="number"
            name="hours"
            min={HOURS_RANGE[kind].min}
            max={HOURS_RANGE[kind].max}
            step={HOURS_RANGE[kind].step}
            required
            value={hours}
            onChange={(e) => setHours(clampHours(kind, Number(e.target.value)))}
          />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.yacht}
          <select
            className={field}
            name="yacht_slug"
            value={yachtId}
            onChange={(e) => setYachtId(e.target.value)}
          >
            {yachts.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} — {y.marina}
              </option>
            ))}
          </select>
        </label>
        <HubPicker
          label={c.form.origin}
          locale={locale}
          valueId={originId}
          onChange={setOriginId}
        />
        <HubPicker
          label={c.form.destination}
          locale={locale}
          valueId={destinationId}
          onChange={setDestinationId}
        />
        <input
          type="hidden"
          name="origin"
          value={placeById(originId)?.name || ""}
        />
        <input
          type="hidden"
          name="destination"
          value={placeById(destinationId)?.name || ""}
        />
        <label className="block text-sm font-semibold">
          {c.form.date}
          <input
            className={field}
            type="date"
            name="trip_date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.time}
          <input className={field} type="time" name="trip_time" required />
        </label>
        <label className="block text-sm font-semibold">
          {c.form.guests}
          <input
            className={field}
            type="number"
            name="guests"
            min={1}
            max={13}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            required
          />
        </label>
        <label className="block text-sm font-semibold md:col-span-2">
          {c.form.notes}
          <textarea className={field} name="notes" rows={3} />
        </label>
      </div>
      {quote ? (
        <p className="mt-5 text-sm font-semibold text-kaenz-deep">
          {c.from} {formatUsd(quote.total)} · {c.pricingTitle}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-md bg-kaenz py-3 text-lg font-bold text-white hover:bg-kaenz-deep disabled:opacity-60"
      >
        {status === "sending" ? c.form.sending : c.form.submit}
      </button>
      {message ? (
        <p
          className={`mt-4 text-sm ${status === "ok" ? "text-kaenz-deep" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
