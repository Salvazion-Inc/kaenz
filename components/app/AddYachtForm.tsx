"use client";

import { useState } from "react";
import { at } from "@/lib/app-copy";
import {
  CAPTAIN_LANG_FLAGS,
  CAPTAIN_LANGS,
  YACHT_TRAITS,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import { marinas } from "@/lib/yachts";
import type { Locale } from "@/lib/locale";
import type { Yacht } from "@/lib/yachts";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

const REGIONS = [
  "South Florida",
  "Miami–Fort Lauderdale",
  "Palm Beach",
  "Florida Keys",
  "Caribbean",
  "Mediterranean",
];

export function AddYachtForm({
  locale,
  onCancel,
  onListed,
}: {
  locale: Locale;
  onCancel: () => void;
  onListed: (yacht: Yacht) => void;
}) {
  const c = at(locale).addYacht;
  const [traits, setTraits] = useState<YachtTrait[]>([]);
  const [langs, setLangs] = useState<CaptainLang[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "err">("idle");
  const [message, setMessage] = useState("");

  function toggleTrait(trait: YachtTrait) {
    setTraits((cur) =>
      cur.includes(trait) ? cur.filter((item) => item !== trait) : [...cur, trait],
    );
  }

  function toggleLang(lang: CaptainLang) {
    setLangs((cur) =>
      cur.includes(lang) ? cur.filter((item) => item !== lang) : [...cur, lang],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage("");
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
    if (photos.length < 1) {
      setStatus("err");
      setMessage(c.needPhotos);
      return;
    }
    setStatus("sending");
    const data = new FormData(form);
    data.set("traits", traits.join(","));
    data.set("languages", langs.join(","));
    data.delete("yacht_photos");
    for (const file of photos) data.append("yacht_photos", file);
    try {
      const res = await fetch("/api/yachts", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          auth: c.needAuth,
          wallet: c.needWallet,
          hin: c.needHin,
          owner_id: c.needOwnerId,
          captain_id: c.needCaptainId,
          mmc: c.needMmc,
          captain_photo: c.needCaptainPhoto,
          photos: c.needPhotos,
          traits: c.needTrait,
          languages: c.needLanguage,
        };
        throw new Error(map[json.error] || c.error);
      }
      onListed(json.yacht);
      form.reset();
      setTraits([]);
      setLangs([]);
      setPhotos([]);
      setStatus("idle");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : c.error);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 space-y-6 rounded-2xl border border-white/10 bg-white p-4 text-navy"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{c.title}</h2>
          <p className="mt-1 text-xs text-navy/60">{c.lead}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-navy/50"
        >
          {c.cancel}
        </button>
      </div>

      <section>
        <h3 className="text-sm font-extrabold">{c.owner}</h3>
        <p className="text-xs text-navy/50">{c.ownerShare}</p>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.ownerName}
          <input className={field} name="owner_name" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.ownerId}
          <input className={field} name="owner_id" type="file" accept="image/*" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.ownerWallet}
          <input className={field} name="owner_wallet" required minLength={32} />
        </label>
      </section>

      <section>
        <h3 className="text-sm font-extrabold">{c.yachtSection}</h3>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.yachtName}
          <input className={field} name="name" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.photos}
          <input
            className={field}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setPhotos(Array.from(e.target.files || []).slice(0, 5))
            }
          />
        </label>
        {photos.length ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {photos.map((file) => (
              <img
                key={file.name + file.size}
                src={URL.createObjectURL(file)}
                alt=""
                className="h-16 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        ) : null}
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.hin}
          <input className={field} name="hin" required minLength={12} maxLength={17} />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.capacity}
          <input
            className={field}
            name="guests"
            type="number"
            min={1}
            max={50}
            required
            defaultValue={8}
          />
        </label>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.traits}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {YACHT_TRAITS.map((trait) => (
            <button
              key={trait}
              type="button"
              onClick={() => toggleTrait(trait)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                traits.includes(trait)
                  ? "bg-navy text-white"
                  : "border border-navy/15 bg-white"
              }`}
            >
              {c[trait]}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.homePort}
          <input className={field} name="home_port" required list="kaenz-marinas" />
          <datalist id="kaenz-marinas">
            {marinas.map((marina) => (
              <option key={marina} value={marina} />
            ))}
          </datalist>
        </label>
      </section>

      <section>
        <h3 className="text-sm font-extrabold">{c.captainSection}</h3>
        <p className="text-xs text-navy/50">{c.captainShare}</p>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainName}
          <input className={field} name="captain_name" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainId}
          <input className={field} name="captain_id" type="file" accept="image/*,.pdf" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.mmc}
          <input className={field} name="captain_mmc" type="file" accept="image/*,.pdf" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainPhoto}
          <input className={field} name="captain_photo" type="file" accept="image/*" required />
        </label>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.languages}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CAPTAIN_LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLang(lang)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                langs.includes(lang)
                  ? "bg-navy text-white"
                  : "border border-navy/15 bg-white"
              }`}
            >
              <img src={CAPTAIN_LANG_FLAGS[lang]} alt="" className="h-3 w-[18px]" />
              {lang === "en"
                ? c.langEn
                : lang === "es"
                  ? c.langEs
                  : lang === "pt"
                    ? c.langPt
                    : c.langFr}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.region}
          <input className={field} name="captain_region" required list="kaenz-regions" />
          <datalist id="kaenz-regions">
            {REGIONS.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainWallet}
          <input className={field} name="captain_wallet" required minLength={32} />
        </label>
      </section>

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "sending" ? c.sending : c.submit}
      </button>
    </form>
  );
}
