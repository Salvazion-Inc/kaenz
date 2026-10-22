"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { at } from "@/lib/app-copy";
import { etaFromKm, haversineKm } from "@/lib/geo";
import {
  CAPTAIN_LANG_FLAGS,
  captainCredential,
  YACHT_TRAITS,
  yachtClassLabel,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import { pathFor, type Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import { yachts, type Yacht } from "@/lib/yachts";
import { useTrip } from "@/lib/trip-store";
import { CaptainAvatar } from "@/components/CaptainAvatar";
import { useOperator } from "@/lib/operator-store";
import { readOnboardingIntent } from "@/lib/signup-prefill";
import { useProfile } from "@/lib/profile-store";
import { AddYachtForm } from "./AddYachtForm";
import { IconBadge } from "./icons";
import { OwnerDesk } from "./OwnerDesk";

export function YachtsTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const { setTrip, trip } = useTrip();
  const { enrollOwner, enrollCaptain } = useOperator();
  const { profile } = useProfile();
  const { here, located, locating, locate } = useLocation();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [intent, setIntent] = useState({ name: "", yacht: "", marina: "", role: "" as "" | "owner" | "captain" | "marina" });
  const [listings, setListings] = useState<Yacht[]>([]);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<
    Array<{ id: string; name: string; homePort: string; ownerName: string; captainName: string }>
  >([]);
  const [resume, setResume] = useState<{
    name: string;
    homePort: string;
    ownerName: string;
    captainName: string;
  } | null>(null);
  const [klass, setKlass] = useState<"all" | YachtTrait>("all");

  useEffect(() => {
    const saved = readOnboardingIntent(document.cookie);
    setIntent(saved);
    const add = new URLSearchParams(window.location.search).get("add");
    if (add === "yacht" || add === "1" || saved.role === "owner" || saved.role === "captain" || saved.yacht) {
      setAdding(true);
    }
  }, []);

  function loadDrafts() {
    fetch("/api/yachts/drafts")
      .then((res) => (res.ok ? res.json() : { drafts: [] }))
      .then((data) => setDrafts(Array.isArray(data.drafts) ? data.drafts : []))
      .catch(() => setDrafts([]));
  }

  useEffect(() => {
    fetch("/api/yachts")
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data.yachts) ? data.yachts : []))
      .catch(() => setListings([]));
    loadDrafts();
  }, []);

  async function removeDraft(id: string) {
    const res = await fetch(`/api/yachts/drafts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) setDrafts((cur) => cur.filter((row) => row.id !== id));
  }

  const list = useMemo(() => {
    const seen = new Set<string>();
    return [...listings, ...yachts]
      .filter((y) => {
        if (!y.id || seen.has(y.id)) return false;
        seen.add(y.id);
        return klass === "all" || y.traits?.includes(klass);
      })
      .map((y) => {
        const hasGeo = Number.isFinite(y.lat) && Number.isFinite(y.lng);
        const km = hasGeo ? haversineKm(here, y) : Number.POSITIVE_INFINITY;
        return { y, km, eta: hasGeo ? etaFromKm(km) : null };
      })
      .sort((a, b) => a.km - b.km);
  }, [here, listings, klass]);

  function request(id: string) {
    if (trip.status === "draft" || trip.status === "rated") {
      setTrip({ yachtId: id, status: "draft" });
    }
    router.push(pathFor(locale, "/app/trip"));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{c.tabs.yachts}</h1>
      <p className="mt-1 text-sm text-white/70">{c.yachtsLead}</p>
      {profile?.role === "owner" ? <OwnerDesk locale={locale} /> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locate}
          className="rounded-full border border-kaenz/40 px-4 py-1.5 text-xs font-bold text-kaenz"
        >
          {locating ? c.locating : located ? here.label : c.useLocation}
        </button>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="btn-kaenz !px-4 !py-1.5 text-xs"
        >
          {c.addYacht.cta}
        </button>
      </div>

      {adding ? (
        <AddYachtForm
          locale={locale}
          role={intent.role === "captain" ? "captain" : "owner"}
          initial={{
            name: resume?.name || intent.yacht,
            homePort: resume?.homePort || intent.marina,
            ownerName: resume?.ownerName || (intent.role === "captain" ? "" : intent.name),
            captainName: resume?.captainName || (intent.role === "captain" ? intent.name : ""),
          }}
          onCancel={() => {
            setAdding(false);
            setResume(null);
          }}
          onDrafted={() => {
            setAdding(false);
            setResume(null);
            setNotice(c.addYacht.draftSaved);
            loadDrafts();
          }}
          onListed={(yacht) => {
            setListings((cur) => [yacht, ...cur.filter((item) => item.id !== yacht.id)]);
            enrollOwner({
              id: yacht.id,
              name: yacht.name,
              image: yacht.image,
              guests: yacht.guests,
              marina: yacht.marina,
            });
            enrollCaptain();
            setAdding(false);
            setNotice(c.addYacht.listed);
          }}
        />
      ) : null}

      {notice ? (
        <p className="mt-3 rounded-xl border border-kaenz/40 bg-kaenz/10 px-3 py-2 text-sm text-kaenz">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKlass("all")}
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            klass === "all"
              ? "bg-kaenz text-white"
              : "border border-white/20 text-white/70"
          }`}
        >
          {c.classAll}
        </button>
        {YACHT_TRAITS.map((trait) => (
          <button
            key={trait}
            type="button"
            onClick={() => setKlass(trait)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              klass === trait
                ? "bg-kaenz text-white"
                : "border border-white/20 text-white/70"
            }`}
          >
            {c.addYacht[trait]}
          </button>
        ))}
      </div>

      {drafts.length ? (
        <section className="mt-5">
          <h2 className="text-sm font-bold">{c.addYacht.yourDrafts}</h2>
          <ul className="mt-2 space-y-2">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2"
              >
                <span className="text-sm font-semibold">{draft.name}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResume(draft);
                      setAdding(true);
                    }}
                    className="rounded-full bg-kaenz px-3 py-1 text-[11px] font-bold text-white"
                  >
                    {c.addYacht.resumeDraft}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeDraft(draft.id)}
                    className="rounded-full border border-white/25 px-3 py-1 text-[11px] font-bold text-white/80"
                  >
                    {c.addYacht.deleteDraft}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="mt-5 space-y-4">
        {list.map(({ y, eta }) => (
          <li
            key={y.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="relative h-40">
              {y.image ? (
                y.image.startsWith("http") ? (
                  <img src={y.image} alt={y.name} className="h-40 w-full object-cover" />
                ) : (
                  <Image src={y.image} alt={y.name} fill className="object-cover" />
                )
              ) : (
                <div className="h-40 bg-white/10" />
              )}
              {y.captain.verified ? (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/80 px-2 py-1 text-[10px] font-bold text-kaenz">
                  <IconBadge className="h-3.5 w-3.5" />
                  {c.verified}
                </span>
              ) : (
                <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-2 py-1 text-[10px] font-bold">
                  {c.addYacht.listed}
                </span>
              )}
              {eta != null ? (
                <span className="absolute right-3 top-3 rounded-full bg-navy/80 px-2 py-1 text-[10px] font-bold">
                  {eta} min {c.away}
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{y.name}</h2>
                  <p className="text-xs text-white/60">
                    {yachtClassLabel(y.class, locale)}
                    {y.lengthFt ? ` · ${y.lengthFt} ft` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/85">
                    {c.maxGuests}: {y.guests}
                  </p>
                  {y.listing ? (
                    <p className="mt-1 text-xs text-white/50">{y.marina}</p>
                  ) : null}
                </div>
              </div>
              {y.photos && y.photos.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {y.photos.slice(0, 5).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-14 w-20 rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : null}
              {y.traits?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {y.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border border-kaenz/35 bg-kaenz/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kaenz"
                    >
                      {c.addYacht[trait]}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-3">
                <CaptainAvatar src={y.captain.photo} name={y.captain.name} size={40} />
                <div className="text-xs">
                  <p className="font-semibold">{y.captain.name}</p>
                  <p className="text-white/60">
                    {captainCredential(y.captain.license, locale)}
                    {y.captain.rating
                      ? ` · ${y.captain.rating} ★ · ${c.captainTrips.replace("{n}", String(y.captain.trips))}`
                      : y.captainRegion
                        ? ` · ${y.captainRegion}`
                        : ""}
                  </p>
                  {y.captainLanguages?.length ? (
                    <div className="mt-1 flex gap-1">
                      {y.captainLanguages.map((lang: CaptainLang) => (
                        <img
                          key={lang}
                          src={CAPTAIN_LANG_FLAGS[lang]}
                          alt={lang}
                          className="h-3 w-[18px]"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-white/75">{y.blurb[locale]}</p>
              <button
                type="button"
                onClick={() => request(y.id)}
                className="mt-4 w-full rounded-xl bg-kaenz py-3 text-sm font-bold text-white"
              >
                {c.requestThis}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
