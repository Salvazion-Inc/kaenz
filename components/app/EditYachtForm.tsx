"use client";

import { useState } from "react";
import { at } from "@/lib/app-copy";
import { classifyListingResponse } from "@/lib/listing-files";
import { yachtManageCopy } from "@/lib/yacht-manage-copy";
import {
  CAPTAIN_LANGS,
  YACHT_TRAITS,
  isHin,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import type { YachtListingStatus } from "@/lib/yacht-owner";
import type { Locale } from "@/lib/locale";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export type EditableYacht = {
  id: string;
  name: string;
  status: YachtListingStatus;
  homePort: string;
  guests: number;
  hin: string;
  traits: YachtTrait[];
  photos: string[];
  ownerName: string;
  ownerWallet: string;
  captainName: string;
  captainLanguages: CaptainLang[];
  captainRegion: string;
  captainWallet: string;
};

function inputValue(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el.value : "";
}

export function EditYachtForm({
  locale,
  yacht,
  onCancel,
  onSaved,
}: {
  locale: Locale;
  yacht: EditableYacht;
  onCancel: () => void;
  onSaved: (next: { id: string; status: YachtListingStatus; name: string }) => void;
}) {
  const c = at(locale).addYacht;
  const manage = yachtManageCopy(locale);
  const [traits, setTraits] = useState<YachtTrait[]>(yacht.traits);
  const [langs, setLangs] = useState<CaptainLang[]>(yacht.captainLanguages);
  const [status, setStatus] = useState<"idle" | "saving" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage("");
    if (!isHin(inputValue(form, "hin"))) {
      setStatus("err");
      setMessage(c.needHin);
      return;
    }
    if (!traits.length) {
      setStatus("err");
      setMessage(c.needTrait);
      return;
    }
    if (!langs.length) {
      setStatus("err");
      setMessage(c.needLanguage);
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const listingStatus =
      submitter instanceof HTMLButtonElement &&
      (submitter.value === "draft" || submitter.value === "listed" || submitter.value === "unlisted")
        ? submitter.value
        : yacht.status;
    setStatus("saving");
    try {
      const res = await fetch(`/api/yachts/${yacht.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: listingStatus,
          owner_name: inputValue(form, "owner_name"),
          owner_wallet: inputValue(form, "owner_wallet"),
          name: inputValue(form, "name"),
          hin: inputValue(form, "hin"),
          guests: inputValue(form, "guests"),
          traits: traits.join(","),
          home_port: inputValue(form, "home_port"),
          captain_name: inputValue(form, "captain_name"),
          languages: langs.join(","),
          captain_region: inputValue(form, "captain_region"),
          captain_wallet: inputValue(form, "captain_wallet"),
        }),
      });
      const json = classifyListingResponse(res.status, await res.text());
      if (!res.ok || json.error) throw new Error(json.error || "save");
      onSaved({
        id: yacht.id,
        status: listingStatus,
        name: inputValue(form, "name"),
      });
    } catch {
      setStatus("err");
      setMessage(manage.manageError);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white p-3 text-navy">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold">{manage.edit}</h3>
          <p className="mt-1 text-xs text-navy/60">{manage.filesStay}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-navy/50">
          {manage.close}
        </button>
      </div>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.ownerName}
        <input className={field} name="owner_name" required defaultValue={yacht.ownerName} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.yachtName}
        <input className={field} name="name" required defaultValue={yacht.name} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.hin}
        <span aria-hidden="true"> *</span>
        <input
          className={field}
          name="hin"
          required
          aria-required="true"
          minLength={12}
          maxLength={24}
          defaultValue={yacht.hin}
          onInvalid={(event) => {
            event.preventDefault();
            setStatus("err");
            setMessage(c.needHin);
          }}
        />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.capacity}
        <input className={field} name="guests" type="number" min={1} max={50} required defaultValue={yacht.guests} />
      </label>
      <p className="text-xs font-bold uppercase tracking-wide text-navy/60">{c.traits}</p>
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={c.traits}>
        {YACHT_TRAITS.map((trait) => {
          const on = traits.includes(trait);
          return (
            <button
              key={trait}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setTraits((cur) => (cur.includes(trait) ? cur.filter((item) => item !== trait) : [...cur, trait]))
              }
              className={`listing-option flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                on ? "border-navy bg-navy/5 font-semibold" : "border-navy/15 bg-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                  on ? "border-navy bg-navy text-white" : "border-navy/30"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              {c[trait]}
            </button>
          );
        })}
      </div>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.homePort}
        <input className={field} name="home_port" required defaultValue={yacht.homePort} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.captainName}
        <input className={field} name="captain_name" required defaultValue={yacht.captainName} />
      </label>
      <p className="text-xs font-bold uppercase tracking-wide text-navy/60">{c.languages}</p>
      <div className="flex flex-wrap gap-2">
        {CAPTAIN_LANGS.map((lang) => {
          const on = langs.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setLangs((cur) => (cur.includes(lang) ? cur.filter((item) => item !== lang) : [...cur, lang]))
              }
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                on ? "border-navy bg-navy text-white" : "border-navy/15 bg-white"
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.region}
        <span aria-hidden="true"> *</span>
        <input className={field} name="captain_region" required defaultValue={yacht.captainRegion} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.ownerWallet}
        <input className={field} name="owner_wallet" autoComplete="off" defaultValue={yacht.ownerWallet} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-navy/60">
        {c.captainWallet}
        <input className={field} name="captain_wallet" autoComplete="off" defaultValue={yacht.captainWallet} />
      </label>
      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          value="listed"
          disabled={status === "saving"}
          className="rounded-xl bg-kaenz py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {status === "saving" ? manage.saving : manage.publish}
        </button>
        <button
          type="submit"
          value={yacht.status}
          disabled={status === "saving"}
          className="rounded-xl border border-navy/15 py-2.5 text-sm font-bold text-navy disabled:opacity-60"
        >
          {status === "saving" ? manage.saving : manage.saveChanges}
        </button>
      </div>
    </form>
  );
}
