"use client";

import { useEffect, useState } from "react";
import { at } from "@/lib/app-copy";
import type { Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import {
  formatCardNumber,
  formatExpiry,
  instagramUrl,
  maskCard,
  PROFILE_ROLES,
  type ProfileRole,
  type SavedCard,
} from "@/lib/profile";
import { useProfile } from "@/lib/profile-store";
import { disableBiometric } from "@/lib/auth/biometric";
import { BiometricControl } from "../auth/BiometricControl";
import { TripCalendar } from "./TripCalendar";

const field =
  "mt-1.5 w-full rounded-xl border border-navy/10 bg-white px-3 py-2.5 text-sm text-navy outline-none";

export function AccountTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const a = c.account;
  const { profile, ready, save } = useProfile();
  const { city: gpsCity, here, located, locating, denied, locate } = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ProfileRole>("customer");
  const [instagram, setInstagram] = useState("");
  const [city, setCity] = useState("");
  const [cityLat, setCityLat] = useState<number | null>(null);
  const [cityLng, setCityLng] = useState<number | null>(null);
  const [wallet, setWallet] = useState("");
  const [creditNumber, setCreditNumber] = useState("");
  const [creditExpiry, setCreditExpiry] = useState("");
  const [debitNumber, setDebitNumber] = useState("");
  const [debitExpiry, setDebitExpiry] = useState("");
  const [replaceCredit, setReplaceCredit] = useState(false);
  const [replaceDebit, setReplaceDebit] = useState(false);
  const [removeCredit, setRemoveCredit] = useState(false);
  const [removeDebit, setRemoveDebit] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errorKey, setErrorKey] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhone(profile.phone);
    setRole(profile.role || "customer");
    setInstagram(profile.instagram ? `@${profile.instagram}` : "");
    setWallet(profile.solanaWallet);
    setReplaceCredit(false);
    setReplaceDebit(false);
    setRemoveCredit(false);
    setRemoveDebit(false);
    setCreditNumber("");
    setCreditExpiry("");
    setDebitNumber("");
    setDebitExpiry("");
  }, [profile]);

  useEffect(() => {
    if (located && gpsCity) {
      setCity(gpsCity);
      setCityLat(here.lat);
      setCityLng(here.lng);
      return;
    }
    if (profile?.city) {
      setCity(profile.city);
      setCityLat(profile.cityLat);
      setCityLng(profile.cityLng);
    }
  }, [located, gpsCity, here.lat, here.lng, profile]);

  if (!ready) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorKey("");
    try {
      await save({
        fullName,
        email,
        phone,
        role,
        instagram,
        city,
        cityLat,
        cityLng,
        solanaWallet: wallet,
        creditCard: cardPayload(
          profile?.creditCard ?? null,
          replaceCredit,
          removeCredit,
          creditNumber,
          creditExpiry,
        ),
        debitCard: cardPayload(
          profile?.debitCard ?? null,
          replaceDebit,
          removeDebit,
          debitNumber,
          debitExpiry,
        ),
      });
      setStatus("ok");
      setReplaceCredit(false);
      setReplaceDebit(false);
      setRemoveCredit(false);
      setRemoveDebit(false);
      setCreditNumber("");
      setCreditExpiry("");
      setDebitNumber("");
      setDebitExpiry("");
    } catch (err) {
      setStatus("err");
      setErrorKey(err instanceof Error ? err.message : "save");
    }
  }

  async function logout() {
    disableBiometric();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const credit = !removeCredit ? profile?.creditCard : null;
  const debit = !removeDebit ? profile?.debitCard : null;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.account}</h1>
      <p className="mt-1 text-sm text-white/70">{a.lead}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-kaenz">
            {a.personal}
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
              {a.fullName}
              <input
                className={field}
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
              {a.email}
              <input
                className={field}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
              {a.phone}
              <input
                className={field}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/60">
              {a.instagram}
              <input
                className={field}
                autoComplete="off"
                placeholder={a.instagramPlaceholder}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </label>
            {profile?.instagram ? (
              <a
                href={instagramUrl(profile.instagram)}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold text-kaenz"
              >
                @{profile.instagram}
              </a>
            ) : null}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">
                {a.city}
              </p>
              <p className="mt-1.5 text-sm font-semibold">
                {locating
                  ? a.locatingCity
                  : city || (denied ? a.cityDenied : a.cityFromGps)}
              </p>
              <p className="mt-1 text-[11px] text-white/45">{a.cityFromGps}</p>
              <button
                type="button"
                onClick={locate}
                className="mt-2 rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80"
              >
                {a.useGps}
              </button>
            </div>
          </div>
        </section>

        <BiometricControl locale={locale} />

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-kaenz">
            {a.role}
          </h2>
          <p className="mt-1 text-xs text-white/50">{a.roleLead}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PROFILE_ROLES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className={`rounded-2xl border p-4 text-left ${
                  role === id
                    ? "border-kaenz bg-kaenz/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="font-bold">{a.roles[id].title}</p>
                <p className="mt-1 text-xs text-white/70">{a.roles[id].body}</p>
              </button>
            ))}
          </div>
        </section>

        <TripCalendar locale={locale} />

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-kaenz">
            {a.payments}
          </h2>
          <p className="mt-1 text-xs text-white/50">{a.paymentsLead}</p>

          <CardBlock
            title={a.creditCard}
            saved={credit ?? null}
            replacing={replaceCredit}
            number={creditNumber}
            expiry={creditExpiry}
            copy={a}
            onNumber={setCreditNumber}
            onExpiry={setCreditExpiry}
            onReplace={() => {
              setReplaceCredit(true);
              setRemoveCredit(false);
            }}
            onRemove={() => {
              setRemoveCredit(true);
              setReplaceCredit(false);
              setCreditNumber("");
              setCreditExpiry("");
            }}
            onKeep={() => {
              setReplaceCredit(false);
              setRemoveCredit(false);
              setCreditNumber("");
              setCreditExpiry("");
            }}
          />

          <CardBlock
            title={a.debitCard}
            saved={debit ?? null}
            replacing={replaceDebit}
            number={debitNumber}
            expiry={debitExpiry}
            copy={a}
            onNumber={setDebitNumber}
            onExpiry={setDebitExpiry}
            onReplace={() => {
              setReplaceDebit(true);
              setRemoveDebit(false);
            }}
            onRemove={() => {
              setRemoveDebit(true);
              setReplaceDebit(false);
              setDebitNumber("");
              setDebitExpiry("");
            }}
            onKeep={() => {
              setReplaceDebit(false);
              setRemoveDebit(false);
              setDebitNumber("");
              setDebitExpiry("");
            }}
          />

          <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-white/60">
            {a.solanaWallet}
            <input
              className={field}
              autoComplete="off"
              spellCheck={false}
              placeholder={a.walletPlaceholder}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            />
          </label>
        </section>

        {status === "ok" ? (
          <p className="text-sm text-kaenz">{a.savedOk}</p>
        ) : null}
        {status === "err" ? (
          <p className="text-sm text-red-400">{errorText(a, errorKey)}</p>
        ) : null}

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {status === "saving" ? a.saving : a.save}
        </button>
      </form>

      <button
        type="button"
        onClick={logout}
        className="mt-6 w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-white/80"
      >
        {a.logout}
      </button>
    </div>
  );
}

function cardPayload(
  saved: SavedCard | null,
  replacing: boolean,
  removing: boolean,
  number: string,
  expiry: string,
) {
  if (removing) return null;
  if (saved && !replacing) return { keep: true };
  if (!number.trim() && !expiry.trim()) return saved ? { keep: true } : null;
  return { number, expiry };
}

function errorText(
  a: ReturnType<typeof at>["account"],
  key: string,
) {
  if (key === "name") return a.errName;
  if (key === "email") return a.errEmail;
  if (key === "phone") return a.errPhone;
  if (key === "credit") return a.errCredit;
  if (key === "debit") return a.errDebit;
  if (key === "wallet") return a.errWallet;
  if (key === "instagram") return a.errInstagram;
  return a.saveError;
}

function CardBlock({
  title,
  saved,
  replacing,
  number,
  expiry,
  copy,
  onNumber,
  onExpiry,
  onReplace,
  onRemove,
  onKeep,
}: {
  title: string;
  saved: SavedCard | null;
  replacing: boolean;
  number: string;
  expiry: string;
  copy: ReturnType<typeof at>["account"];
  onNumber: (value: string) => void;
  onExpiry: (value: string) => void;
  onReplace: () => void;
  onRemove: () => void;
  onKeep: () => void;
}) {
  const showForm = !saved || replacing;
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-navy/40 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-white/70">
        {title}
      </p>
      {saved && !replacing ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{maskCard(saved)}</p>
            <p className="text-xs text-white/50">
              {copy.expiry} {saved.expiry}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReplace}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80"
            >
              {copy.replace}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80"
            >
              {copy.remove}
            </button>
          </div>
        </div>
      ) : null}
      {showForm ? (
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-bold text-white/60">
            {copy.cardNumber}
            <input
              className={field}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              value={number}
              onChange={(e) => onNumber(formatCardNumber(e.target.value))}
            />
          </label>
          <label className="block text-xs font-bold text-white/60">
            {copy.expiry}
            <input
              className={field}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="12/28"
              value={expiry}
              onChange={(e) => onExpiry(formatExpiry(e.target.value))}
            />
          </label>
          {saved && replacing ? (
            <button
              type="button"
              onClick={onKeep}
              className="text-xs font-semibold text-kaenz"
            >
              {copy.keep}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
