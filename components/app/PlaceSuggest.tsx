"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { at } from "@/lib/app-copy";
import { formatKm, haversineKm } from "@/lib/geo";
import type { Locale } from "@/lib/locale";
import { placeCountry, type Place } from "@/lib/places";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

function haystack(place: Place, locale: Locale) {
  return `${place.name} ${place.city} ${place.address || ""} ${place.region || ""} ${placeCountry(place, locale)} ${place.blurb[locale]} ${place.kind}`.toLowerCase();
}

function uniquePlaces(items: Place[]) {
  const seen = new Set<string>();
  return items.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function recommendPlaces(
  items: Place[],
  query: string,
  here: { lat: number; lng: number },
  locale: Locale,
  limit = 8,
) {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const ranked = uniquePlaces(items)
    .map((place) => {
      const hay = haystack(place, locale);
      if (tokens.length && !tokens.every((token) => hay.includes(token))) {
        return null;
      }
      const km = haversineKm(here, place);
      const starts =
        place.name.toLowerCase().startsWith(q) ||
        place.city.toLowerCase().startsWith(q)
          ? 0
          : 1;
      return { place, km, starts };
    })
    .filter((row): row is { place: Place; km: number; starts: number } =>
      Boolean(row),
    )
    .sort((a, b) => a.starts - b.starts || a.km - b.km);
  return ranked.slice(0, limit);
}

function labelFor(place: Place, locale: Locale) {
  const country = placeCountry(place, locale);
  return country && country !== place.city
    ? `${place.name} — ${place.city}, ${country}`
    : `${place.name} — ${place.city}`;
}

export function PlaceSuggest({
  locale,
  label,
  placeholder,
  valueId,
  places,
  here,
  onSelect,
}: {
  locale: Locale;
  label: string;
  placeholder: string;
  valueId: string;
  places: Place[];
  here: { lat: number; lng: number };
  onSelect: (id: string) => void;
}) {
  const c = at(locale);
  const selected = places.find((p) => p.id === valueId);
  const [query, setQuery] = useState(
    selected ? labelFor(selected, locale) : "",
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setQuery(labelFor(selected, locale));
  }, [selected, locale]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const searching =
    open &&
    (!selected || query.trim() !== labelFor(selected, locale).trim());
  const suggestions = useMemo(
    () =>
      recommendPlaces(
        places,
        searching ? query : "",
        here,
        locale,
      ),
    [places, query, here, locale, searching],
  );

  function pick(place: Place) {
    onSelect(place.id);
    setQuery(labelFor(place, locale));
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && suggestions[active]) {
      e.preventDefault();
      pick(suggestions[active].place);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative">
      <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
        {label}
        <input
          className={field}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
      </label>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-navy/10 bg-white py-1 text-navy shadow-xl"
        >
          {!searching ? (
            <li className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-kaenz-deep">
              {c.suggestedNearYou}
            </li>
          ) : null}
          {suggestions.length ? (
            suggestions.map(({ place, km }, i) => (
              <li key={place.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(place)}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left ${
                    i === active ? "bg-kaenz/10" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {place.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-navy/55">
                      {c.kinds[place.kind]} · {place.city}
                      {placeCountry(place, locale) !== place.city
                        ? `, ${placeCountry(place, locale)}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-kaenz-deep">
                    {formatKm(km)}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm text-navy/60">{c.noPlaceMatch}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
