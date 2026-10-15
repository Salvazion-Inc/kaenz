"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { VerifySubmitNote } from "@/components/VerifySubmitNote";
import { useAccountVerified } from "@/components/useAccountVerified";
import { at } from "@/lib/app-copy";
import { loginUrl } from "@/lib/form-gate";
import { yachtManageCopy } from "@/lib/yacht-manage-copy";
import type { YachtListingStatus } from "@/lib/yacht-owner";
import { etaFromKm, haversineKm } from "@/lib/geo";
import {
  CAPTAIN_LANG_FLAGS,
  YACHT_TRAITS,
  type CaptainLang,
  type YachtTrait,
} from "@/lib/listings";
import { pathFor, type Locale } from "@/lib/locale";
import { useLocation } from "@/lib/location";
import { yachts, type Yacht } from "@/lib/yachts";
import { useTrip } from "@/lib/trip-store";
import { CaptainAvatar } from "@/components/CaptainAvatar";
import { useOperator } from "@/lib/operator-store";
import { useProfile } from "@/lib/profile-store";
import { AddYachtForm } from "./AddYachtForm";
import { EditYachtForm, type EditableYacht } from "./EditYachtForm";
import { IconBadge } from "./icons";
import { OwnerDesk } from "./OwnerDesk";

type OwnedYacht = {
  id: string;
  name: string;
  status: YachtListingStatus;
  homePort: string;
  photo: string;
};

export function YachtsTab({ locale }: { locale: Locale }) {
  const c = at(locale);
  const manage = yachtManageCopy(locale);
  const verified = useAccountVerified();
  const { setTrip, trip } = useTrip();
  const { enrollOwner, enrollCaptain } = useOperator();
  const { profile } = useProfile();
  const { here, located, locating, locate } = useLocation();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [listings, setListings] = useState<Yacht[]>([]);
  const [owned, setOwned] = useState<OwnedYacht[]>([]);
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [manageId, setManageId] = useState("");
  const [detail, setDetail] = useState<EditableYacht | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit" | "">("");
  const [klass, setKlass] = useState<"all" | YachtTrait>("all");

  useEffect(() => {
    const add = new URLSearchParams(window.location.search).get("add");
    if (add === "yacht" || add === "1") setAdding(true);
  }, []);

  useEffect(() => {
    fetch("/api/yachts")
      .then((res) => res.json())
      .then((data) => setListings(Array.isArray(data.yachts) ? data.yachts : []))
      .catch(() => setListings([]));
  }, []);

  useEffect(() => {
    fetch("/api/yachts/mine")
      .then((res) => (res.ok ? res.json() : { yachts: [] }))
      .then((data) => setOwned(Array.isArray(data.yachts) ? data.yachts : []))
      .catch(() => setOwned([]));
  }, []);

  async function refreshPublic() {
    const res = await fetch("/api/yachts");
    const data = await res.json().catch(() => ({ yachts: [] }));
    setListings(Array.isArray(data.yachts) ? data.yachts : []);
  }

  async function openOwned(id: string, mode: "view" | "edit") {
    if (detail?.id === id && detailMode === mode) {
      setDetail(null);
      setDetailMode("");
      return;
    }
    setManageId(id);
    setNotice("");
    const res = await fetch(`/api/yachts/${id}`);
    setManageId("");
    if (res.status === 401) {
      window.location.assign(loginUrl("/app/yachts"));
      return;
    }
    if (!res.ok) {
      setNotice(manage.manageError);
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data?.yacht) {
      setNotice(manage.manageError);
      return;
    }
    setDetail(data.yacht as EditableYacht);
    setDetailMode(mode);
  }

  async function changeOwned(id: string, action: "listed" | "unlisted" | "delete") {
    setManageId(id);
    setNotice("");
    const res = await fetch(`/api/yachts/${id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ status: action }),
    });
    setManageId("");
    if (res.status === 401) {
      window.location.assign(loginUrl("/app/yachts"));
      return;
    }
    if (!res.ok) {
      setNotice(manage.manageError);
      return;
    }
    if (action === "delete") {
      setOwned((cur) => cur.filter((yacht) => yacht.id !== id));
      setListings((cur) => cur.filter((yacht) => yacht.id !== id));
      setConfirmId("");
      if (detail?.id === id) {
        setDetail(null);
        setDetailMode("");
      }
      setNotice(manage.deleted);
      return;
    }
    setOwned((cur) => cur.map((yacht) => (yacht.id === id ? { ...yacht, status: action } : yacht)));
    setDetail((cur) => (cur && cur.id === id ? { ...cur, status: action } : cur));
    if (action === "listed") {
      await refreshPublic();
      setNotice(manage.publishedDone);
      return;
    }
    setListings((cur) => cur.filter((yacht) => yacht.id !== id));
    setNotice(manage.unpublishedDone);
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
          onCancel={() => setAdding(false)}
          onListed={(yacht, listingStatus) => {
            const summary: OwnedYacht = {
              id: yacht.id,
              name: yacht.name,
              status: listingStatus,
              homePort: yacht.marina,
              photo: yacht.image,
            };
            setOwned((cur) => [summary, ...cur.filter((item) => item.id !== yacht.id)]);
            if (listingStatus === "listed") {
              setListings((cur) => [yacht, ...cur.filter((item) => item.id !== yacht.id)]);
              enrollOwner({
                id: yacht.id,
                name: yacht.name,
                image: yacht.image,
                guests: yacht.guests,
                marina: yacht.marina,
              });
              enrollCaptain();
            }
            setAdding(false);
            setNotice(listingStatus === "draft" ? manage.savedDraft : c.addYacht.listed);
          }}
        />
      ) : null}

      {notice ? (
        <p className="mt-3 rounded-xl border border-kaenz/40 bg-kaenz/10 px-3 py-2 text-sm text-kaenz">
          {notice}
        </p>
      ) : null}

      {owned.length ? (
        <section className="mt-5">
          <h2 className="text-sm font-extrabold">{manage.yourYachts}</h2>
          <ul className="mt-2 space-y-2">
            {owned.map((yacht) => (
              <li
                key={yacht.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{yacht.name}</p>
                    <p className="text-[11px] text-white/55">
                      {yacht.homePort} · {manage[yacht.status]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {yacht.status === "listed" ? (
                      <button
                        type="button"
                        disabled={manageId === yacht.id}
                        onClick={() => changeOwned(yacht.id, "unlisted")}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold"
                      >
                        {manageId === yacht.id ? manage.working : manage.unpublish}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={manageId === yacht.id}
                        onClick={() => changeOwned(yacht.id, "listed")}
                        className="rounded-full border border-kaenz/50 px-3 py-1 text-[11px] font-bold text-kaenz"
                      >
                        {manageId === yacht.id ? manage.working : manage.publish}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openOwned(yacht.id, "view")}
                      className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold"
                    >
                      {manage.view}
                    </button>
                    <button
                      type="button"
                      onClick={() => openOwned(yacht.id, "edit")}
                      className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold"
                    >
                      {manage.edit}
                    </button>
                    {confirmId === yacht.id ? (
                      <>
                        <button
                          type="button"
                          disabled={manageId === yacht.id}
                          onClick={() => changeOwned(yacht.id, "delete")}
                          className="rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold text-white"
                        >
                          {manage.confirmDelete}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId("")}
                          className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold"
                        >
                          {manage.cancel}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(yacht.id)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-bold"
                      >
                        {manage.delete}
                      </button>
                    )}
                  </div>
                </div>
                {detail?.id === yacht.id && detailMode === "view" ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-navy/40 p-3 text-xs text-white/80">
                    {detail.photos[0] ? (
                      <img src={detail.photos[0]} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
                    ) : null}
                    <p className="font-bold text-white">{detail.name}</p>
                    <p className="mt-1">
                      {detail.homePort} · {detail.guests} · {detail.hin}
                    </p>
                    <p className="mt-1">
                      {detail.captainName} · {detail.captainRegion}
                    </p>
                    <p className="mt-1">{detail.traits.join(", ")}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setDetail(null);
                        setDetailMode("");
                      }}
                      className="mt-2 text-[11px] font-bold text-kaenz"
                    >
                      {manage.close}
                    </button>
                  </div>
                ) : null}
                {detail?.id === yacht.id && detailMode === "edit" ? (
                  <EditYachtForm
                    locale={locale}
                    yacht={detail}
                    onCancel={() => {
                      setDetail(null);
                      setDetailMode("");
                    }}
                    onSaved={(next) => {
                      setOwned((cur) =>
                        cur.map((item) =>
                          item.id === next.id ? { ...item, status: next.status, name: next.name } : item,
                        ),
                      );
                      setDetail(null);
                      setDetailMode("");
                      if (next.status === "listed") {
                        void refreshPublic();
                        setNotice(manage.publishedDone);
                      } else if (next.status === "draft") {
                        setListings((cur) => cur.filter((item) => item.id !== next.id));
                        setNotice(manage.savedDraft);
                      } else {
                        setListings((cur) => cur.filter((item) => item.id !== next.id));
                        setNotice(manage.unpublishedDone);
                      }
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {verified === false ? (
        <div className="mt-3">
          <VerifySubmitNote locale={locale} verified={verified} />
        </div>
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
                    {y.class}
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
                    {y.captain.license}
                    {y.captain.rating
                      ? ` · ${y.captain.rating} ★ · ${y.captain.trips} trips`
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
