"use client";

import { useState } from "react";
import { VerifySubmitNote } from "@/components/VerifySubmitNote";
import { useAccountVerified } from "@/components/useAccountVerified";
import { at } from "@/lib/app-copy";
import { loginUrl } from "@/lib/form-gate";
import { compressListingImage, uploadSignedListingFile } from "@/lib/listing-direct";
import {
  LISTING_MAX_BYTES,
  classifyListingResponse,
  directListingPayload,
  rawListingFileTooBig,
  validateListingFileSet,
} from "@/lib/listing-files";
import { fetchAccountAccess } from "@/lib/submit-access";
import { verifySubmitMessage, yachtManageCopy } from "@/lib/yacht-manage-copy";
import {
  CAPTAIN_LANG_FLAGS,
  CAPTAIN_LANGS,
  YACHT_TRAITS,
  isHin,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
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
}: {
  locale: Locale;
  onCancel: () => void;
  onListed: (yacht: Yacht, listingStatus: "listed" | "draft") => void;
}) {
  const c = at(locale).addYacht;
  const manage = yachtManageCopy(locale);
  const verified = useAccountVerified();
  const [traits, setTraits] = useState<YachtTrait[]>([]);
  const [langs, setLangs] = useState<CaptainLang[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "preparing" | "uploading" | "saving" | "err">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, percent: 0 });
  const [message, setMessage] = useState("");
  const busy = status === "preparing" || status === "uploading" || status === "saving";

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

  function rejectOversized(list: File[]) {
    if (list.some((file) => rawListingFileTooBig(file))) {
      setStatus("err");
      setMessage(c.fileTooBig);
      return true;
    }
    if (list.length > 0) {
      setMessage((cur) => (cur === c.fileTooBig ? "" : cur));
      setStatus((cur) => (cur === "err" ? "idle" : cur));
    }
    return false;
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
      unverified: verifySubmitMessage(locale),
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
    if (photos.length < 1) {
      setStatus("err");
      setMessage(c.needPhotos);
      return;
    }
    const ownerId = inputFile(form, "owner_id");
    const captainId = inputFile(form, "captain_id");
    const captainMmc = inputFile(form, "captain_mmc");
    const captainPhoto = inputFile(form, "captain_photo");
    if (!ownerId || !captainId || !captainMmc || !captainPhoto) {
      setStatus("err");
      setMessage(c.error);
      return;
    }
    const selected = [ownerId, captainId, captainMmc, captainPhoto, ...photos];
    if (selected.some((file) => rawListingFileTooBig(file))) {
      setStatus("err");
      setMessage(c.fileTooBig);
      return;
    }
    if (verified === false) {
      setStatus("err");
      setMessage(verifySubmitMessage(locale));
      return;
    }
    if (!isHin(inputValue(form, "hin"))) {
      setStatus("err");
      setMessage(c.needHin);
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const listingStatus =
      submitter instanceof HTMLButtonElement && submitter.value === "draft" ? "draft" : "listed";
    const access = await fetchAccountAccess();
    if (access && !access.user) {
      window.location.assign(loginUrl(`${window.location.pathname}${window.location.search}`));
      return;
    }
    if (access && !access.verified) {
      setStatus("err");
      setMessage(verifySubmitMessage(locale));
      return;
    }
    setStatus("preparing");
    setProgress({ done: 0, total: 0, percent: 0 });
    await new Promise((resolve) => {
      window.setTimeout(resolve, 50);
    });
    try {
      const prepared = [
        {
          slot: "owner_id",
          file: ownerId.type.startsWith("image/") ? await compressListingImage(ownerId) : ownerId,
        },
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
      if (prepared.some((item) => item.file.size > LISTING_MAX_BYTES)) {
        setStatus("err");
        setMessage(c.fileTooBig);
        return;
      }
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
      const loaded = uploads.map(() => 0);
      const totals = uploads.map(() => 0);
      setStatus("uploading");
      setProgress({ done: 0, total: uploads.length, percent: 0 });
      const report = () => {
        const sumLoaded = loaded.reduce((sum, value) => sum + value, 0);
        const sumTotal = totals.reduce((sum, value) => sum + value, 0);
        const done = loaded.filter((value, index) => totals[index] > 0 && value >= totals[index]).length;
        setProgress({
          done,
          total: uploads.length,
          percent: sumTotal > 0 ? Math.min(100, Math.round((sumLoaded / sumTotal) * 100)) : 0,
        });
      };
      await Promise.all(
        uploads.map(async (upload, index) => {
          const file = upload.slot ? bySlot.get(upload.slot) : undefined;
          if (!file || !upload.signedUrl || !upload.path) throw new Error(c.uploadFailed);
          await uploadSignedListingFile(upload.signedUrl, file, (sent, total) => {
            loaded[index] = sent;
            totals[index] = total;
            report();
          });
          loaded[index] = file.size;
          totals[index] = file.size;
          report();
        }),
      );
      setStatus("saving");
      setProgress({ done: uploads.length, total: uploads.length, percent: 100 });

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
        status: listingStatus,
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
      onListed(json.yacht as Yacht, listingStatus);
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

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 space-y-6 rounded-2xl border border-white/10 bg-white p-4 text-navy"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{c.title}</h2>
          <p className="mt-1 text-xs text-navy/60">{c.lead}</p>
          <p className="mt-2 text-xs font-semibold text-navy/70">{manage.fileLimit}</p>
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
          <input
            className={field}
            name="owner_id"
            type="file"
            accept="image/*,.pdf"
            required
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (rejectOversized(list)) e.target.value = "";
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
          <input className={field} name="name" required />
        </label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-navy/60">
          {c.photos}
          <input
            className={field}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const list = Array.from(e.target.files || []).slice(0, 5);
              if (rejectOversized(list)) {
                e.target.value = "";
                setPhotos([]);
                return;
              }
              setPhotos(list);
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
          <span aria-hidden="true"> *</span>
          <input
            className={field}
            name="hin"
            required
            aria-required="true"
            minLength={12}
            maxLength={24}
            placeholder={c.hinPlaceholder}
            onInvalid={(event) => {
              event.preventDefault();
              setStatus("err");
              setMessage(c.needHin);
            }}
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
        <div className="mt-2 grid gap-2 sm:grid-cols-3" role="group" aria-label={c.traits}>
          {YACHT_TRAITS.map((trait) => {
            const on = traits.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTrait(trait)}
                className={`listing-option flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  on
                    ? "border-navy bg-navy/5 font-semibold text-navy"
                    : "border-navy/15 bg-white text-navy/80"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    on ? "border-navy bg-navy text-white" : "border-navy/30 bg-white"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                {c[trait]}
              </button>
            );
          })}
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
          <input
            className={field}
            name="captain_id"
            type="file"
            accept="image/*,.pdf"
            required
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (rejectOversized(list)) e.target.value = "";
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
            required
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (rejectOversized(list)) e.target.value = "";
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
            required
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (rejectOversized(list)) e.target.value = "";
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
          <span aria-hidden="true"> *</span>
          <input className={field} name="captain_region" required aria-required="true" list="kaenz-regions" />
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

      <VerifySubmitNote locale={locale} verified={verified} />

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {busy ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <p className="text-sm font-semibold text-navy">
            {status === "preparing"
              ? manage.preparing
              : status === "saving"
                ? manage.saving
                : `${manage.uploading} ${progress.done}/${progress.total} · ${progress.percent}%`}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-navy/10">
            <div
              className="h-2 rounded-full bg-kaenz transition-[width] duration-200"
              style={{ width: `${status === "preparing" ? 8 : progress.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          value="listed"
          disabled={busy || verified === false}
          className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy
            ? status === "preparing"
              ? manage.preparing
              : status === "saving"
                ? manage.saving
                : `${manage.uploading} ${progress.percent}%`
            : c.submit}
        </button>
        <button
          type="submit"
          value="draft"
          disabled={busy || verified === false}
          className="w-full rounded-xl border border-navy/15 py-3 text-sm font-bold text-navy disabled:opacity-60"
        >
          {busy
            ? status === "preparing"
              ? manage.preparing
              : status === "saving"
                ? manage.saving
                : `${manage.uploading} ${progress.percent}%`
            : manage.saveDraft}
        </button>
      </div>
    </form>
  );
}
