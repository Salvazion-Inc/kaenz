"use client";

import { useEffect, useRef, useState } from "react";
import { at } from "@/lib/app-copy";
import { compressListingImage, uploadSignedListingFile } from "@/lib/listing-direct";
import {
  classifyListingResponse,
  directListingPayload,
  LISTING_MAX_BYTES,
  validateListingFileSet,
} from "@/lib/listing-files";
import {
  CAPTAIN_LANG_FLAGS,
  CAPTAIN_LANGS,
  YACHT_TRAITS,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import { trackFunnel } from "@/lib/track-funnel";
import { marinas } from "@/lib/yachts";
import { PayoutsNotice } from "./PayoutsSection";
import type { Locale } from "@/lib/locale";
import type { Yacht } from "@/lib/yachts";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

function inputFile(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  if (!(el instanceof HTMLInputElement) || !el.files?.[0]) return null;
  return el.files[0];
}

function clearIfOversized(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  if (!(el instanceof HTMLInputElement) || !el.files?.[0]) return false;
  if (el.files[0].size <= LISTING_MAX_BYTES) return false;
  el.value = "";
  return true;
}

function inputValue(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el.value : "";
}

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
  onDrafted,
  initial,
  role = "owner",
}: {
  locale: Locale;
  onCancel: () => void;
  onListed: (yacht: Yacht) => void;
  onDrafted?: () => void;
  initial?: { name?: string; homePort?: string; ownerName?: string; captainName?: string };
  role?: "owner" | "captain";
}) {
  const c = at(locale).addYacht;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    trackFunnel("listing_started", role);
  }, [role]);
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

  function messageFor(code: string) {
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
      too_large: c.tooLarge,
      file_too_big: c.fileTooBig,
      documents: c.missingDocs,
      upload: c.uploadFailed,
      http: c.badResponse,
      empty: c.badResponse,
      fields: c.error,
      guests: c.error,
      save: c.error,
      supabase: c.error,
    };
    return map[code] || c.badResponse;
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
    const oversized =
      clearIfOversized(form, "owner_id") ||
      clearIfOversized(form, "captain_id") ||
      clearIfOversized(form, "captain_mmc") ||
      clearIfOversized(form, "captain_photo") ||
      photos.some((file) => file.size > LISTING_MAX_BYTES);
    if (oversized) {
      setPhotos((cur) => cur.filter((file) => file.size <= LISTING_MAX_BYTES));
      setStatus("err");
      setMessage(c.fileTooBig);
      return;
    }
    const ownerId = inputFile(form, "owner_id");
    const captainId = inputFile(form, "captain_id");
    const captainMmc = inputFile(form, "captain_mmc");
    const captainPhoto = inputFile(form, "captain_photo");
    const missing = [
      ownerId ? "" : c.ownerId,
      captainId ? "" : c.captainId,
      captainMmc ? "" : c.mmc,
      captainPhoto ? "" : c.captainPhoto,
      photos.length ? "" : c.photos,
    ].filter(Boolean);
    if (!ownerId || !captainId || !captainMmc || !captainPhoto || !photos.length) {
      setStatus("err");
      setMessage(`${c.missingDocs} ${missing.join(", ")}.`);
      return;
    }
    setStatus("sending");
    try {
      const prepared = [
        { slot: "owner_id", file: await compressListingImage(ownerId) },
        {
          slot: "captain_id",
          file: captainId.type.startsWith("image/")
            ? await compressListingImage(captainId)
            : captainId,
        },
        {
          slot: "captain_mmc",
          file: captainMmc.type.startsWith("image/")
            ? await compressListingImage(captainMmc)
            : captainMmc,
        },
        { slot: "captain_photo", file: await compressListingImage(captainPhoto) },
        ...(await Promise.all(
          photos.map(async (file, index) => ({
            slot: `yacht_${index}`,
            file: await compressListingImage(file),
          })),
        )),
      ];
      const descriptors = prepared.map(({ slot, file }) => ({
        slot,
        name: file.name,
        type: file.type,
        size: file.size,
      }));
      const checked = validateListingFileSet(descriptors);
      if (!checked.ok) throw new Error(messageFor(checked.error));

      const signRes = await fetch("/api/yachts/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: descriptors }),
      });
      const signed = classifyListingResponse(signRes.status, await signRes.text());
      if (!signRes.ok || signed.error) throw new Error(messageFor(signed.error));
      const uploads = (signed.uploads || []) as Array<{
        slot?: string;
        path?: string;
        signedUrl?: string;
      }>;
      const bySlot = new Map(prepared.map((item) => [item.slot, item.file]));
      await Promise.all(
        uploads.map(async (upload) => {
          const file = upload.slot ? bySlot.get(upload.slot) : undefined;
          if (!file || !upload.signedUrl || !upload.path) throw new Error(c.uploadFailed);
          await uploadSignedListingFile(upload.signedUrl, file);
        }),
      );

      const payload = directListingPayload({
        listingId: signed.listingId || "",
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
        uploads: uploads.map((upload) => ({
          slot: String(upload.slot || ""),
          path: String(upload.path || ""),
        })),
      });
      const res = await fetch("/api/yachts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = classifyListingResponse(res.status, await res.text());
      if (!res.ok || json.error) throw new Error(messageFor(json.error));
      onListed(json.yacht as Yacht);
      form.reset();
      setTraits([]);
      setLangs([]);
      setPhotos([]);
      setStatus("idle");
    } catch (err) {
      setStatus("err");
      const text = err instanceof Error ? err.message : "";
      if (
        text === "upload" ||
        text === "too_large" ||
        text === "file_too_big" ||
        text === "http" ||
        text === "empty"
      ) {
        setMessage(messageFor(text));
        return;
      }
      setMessage(text && !/unexpected token|not valid json/i.test(text) ? text : c.badResponse);
    }
  }

  async function saveDraft() {
    const form = formRef.current;
    if (!form) return;
    setMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/yachts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: true,
          role,
          name: inputValue(form, "name"),
          home_port: inputValue(form, "home_port"),
          owner_name: inputValue(form, "owner_name"),
          captain_name: inputValue(form, "captain_name"),
        }),
      });
      const json = classifyListingResponse(res.status, await res.text());
      if (!res.ok || json.error) throw new Error(messageFor(json.error || "save"));
      onDrafted?.();
      setStatus("idle");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : c.error);
    }
  }

  return (
    <form
      ref={formRef}
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
          <input className={field} name="owner_name" defaultValue={initial?.ownerName || ""} required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.ownerId}
          <input
            className={field}
            name="owner_id"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (clearIfOversized(e.currentTarget.form!, "owner_id")) {
                setStatus("err");
                setMessage(c.fileTooBig);
              }
            }}
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.ownerWallet}
          <input
            className={field}
            name="owner_wallet"
            autoComplete="off"
            placeholder={c.walletOptional}
          />
        </label>
      </section>

      <section>
        <h3 className="text-sm font-extrabold">{c.yachtSection}</h3>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.yachtName}
          <input className={field} name="name" defaultValue={initial?.name || ""} required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.photos}
          <input
            className={field}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files || []).slice(0, 5);
              if (picked.some((file) => file.size > LISTING_MAX_BYTES)) {
                e.target.value = "";
                setPhotos(picked.filter((file) => file.size <= LISTING_MAX_BYTES));
                setStatus("err");
                setMessage(c.fileTooBig);
                return;
              }
              setPhotos(picked);
            }}
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
          <input
            className={field}
            name="hin"
            required
            minLength={12}
            maxLength={24}
            placeholder={c.hinPlaceholder}
          />
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
          <input
            className={field}
            name="home_port"
            defaultValue={initial?.homePort || ""}
            required
            list="kaenz-marinas"
          />
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
          <input
            className={field}
            name="captain_name"
            defaultValue={initial?.captainName || ""}
            required
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainId}
          <input
            className={field}
            name="captain_id"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (clearIfOversized(e.currentTarget.form!, "captain_id")) {
                setStatus("err");
                setMessage(c.fileTooBig);
              }
            }}
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.mmc}
          <input
            className={field}
            name="captain_mmc"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (clearIfOversized(e.currentTarget.form!, "captain_mmc")) {
                setStatus("err");
                setMessage(c.fileTooBig);
              }
            }}
          />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.captainPhoto}
          <input
            className={field}
            name="captain_photo"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (clearIfOversized(e.currentTarget.form!, "captain_photo")) {
                setStatus("err");
                setMessage(c.fileTooBig);
              }
            }}
          />
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
          <input
            className={field}
            name="captain_wallet"
            autoComplete="off"
            placeholder={c.walletOptional}
          />
        </label>
      </section>

      <PayoutsNotice locale={locale} />

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveDraft}
        disabled={status === "sending"}
        className="w-full rounded-xl border border-kaenz py-3 text-sm font-bold text-kaenz disabled:opacity-60"
      >
        {c.saveDraft}
      </button>
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
