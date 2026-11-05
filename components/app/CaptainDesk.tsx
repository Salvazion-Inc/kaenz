"use client";

import { useEffect, useState } from "react";
import { at } from "@/lib/app-copy";
import { formatKm } from "@/lib/geo";
import type { Locale } from "@/lib/locale";
import { useDispatch, type TripOffer } from "@/lib/dispatch-store";
import { fetchOfferGate, postOfferAccept, postOfferDecline } from "@/lib/offer-client";
import { useOperator } from "@/lib/operator-store";
import { useTrip } from "@/lib/trip-store";

export function CaptainDesk({ locale }: { locale: Locale }) {
  const o = at(locale).ops;
  const { captain, available, setAvailable, yachts } = useOperator();
  const { offers, accept, decline, addPassenger } = useDispatch();
  const { fleet } = useTrip();
  const [name, setName] = useState("");
  const [pickup, setPickup] = useState("");
  const [remote, setRemote] = useState<TripOffer[]>([]);
  const [autoAccept, setAutoAccept] = useState(false);
  const mine = yachts.map((y) => y.id);

  useEffect(() => {
    if (!captain) return;
    let cancelled = false;
    async function load() {
      const gate = await fetchOfferGate();
      if (cancelled) return;
      setAutoAccept(gate.autoAccept);
      setRemote(
        gate.offers.map((row) => ({
          id: row.id,
          customerName: row.customerName,
          originId: "",
          destinationId: "",
          originName: row.originName,
          destName: row.destName,
          originLat: 0,
          originLng: 0,
          guests: row.guests,
          kind: row.kind,
          hours: row.hours,
          yachtId: row.yachtId,
          ranked: [],
          status: row.status,
          extraPassengers: [],
          createdAt: Date.now(),
        })),
      );
    }
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [captain]);

  const remoteIds = new Set(remote.map((offer) => offer.id));
  const merged = new Map<string, TripOffer>();
  for (const offer of [...offers, ...remote]) {
    const prev = merged.get(offer.id);
    if (!prev || (prev.status !== "accepted" && offer.status === "accepted")) {
      merged.set(offer.id, offer);
    }
  }
  const incoming = [...merged.values()].filter((offer) => {
    if (offer.status === "declined") return false;
    if (offer.status === "accepted") {
      return mine.includes(offer.yachtId) || captain;
    }
    if (!available) return false;
    if (remoteIds.has(offer.id)) return captain;
    if (mine.length) return offer.ranked.some((r) => mine.includes(r.yachtId));
    return captain;
  });

  if (!captain) return null;

  return (
    <section className="kaenz-card mb-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kaenz-kicker">{o.captainDesk}</p>
          <h2 className="mt-1 text-lg font-extrabold">{o.captainDesk}</h2>
          <p className="mt-1 text-xs text-white/65">{o.captainLead}</p>
        </div>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
            available ? "bg-kaenz text-white" : "border border-white/20 text-white/70"
          }`}
        >
          {available ? o.available : o.away}
        </button>
      </div>

      {incoming.length === 0 ? (
        <p className="mt-4 text-sm text-white/55">{o.noOffers}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {incoming.map((offer) => {
            const nearest = offer.ranked[0];
            const yacht = fleet.find((y) => y.id === offer.yachtId);
            const cap = yacht?.guests || nearest?.guests || offer.guests;
            const seats = cap - offer.guests - offer.extraPassengers.length;
            return (
              <li
                key={offer.id}
                className="rounded-xl border border-white/10 bg-navy/40 p-3"
              >
                <p className="text-sm font-bold">
                  {offer.originName} → {offer.destName}
                </p>
                <p className="mt-1 text-[11px] text-white/55">
                  {offer.customerName} · {offer.guests} · {offer.kind} · {offer.hours}h
                  {nearest ? ` · ${formatKm(nearest.km)} ${o.kmAway}` : ""}
                </p>
                {offer.status === "offered" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const yid = mine[0] || offer.ranked[0]?.yachtId || offer.yachtId;
                        const saved = await postOfferAccept(offer.id, yid);
                        if (!saved.ok && !saved.autoAccept) return;
                        accept(offer.id, yid);
                        setRemote((cur) =>
                          cur.map((item) =>
                            item.id === offer.id
                              ? { ...item, status: "accepted", yachtId: yid }
                              : item,
                          ),
                        );
                      }}
                      className="btn-kaenz !px-3 !py-1.5 text-[11px]"
                    >
                      {o.accept}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const saved = await postOfferDecline(offer.id);
                        if (!saved.declined && !saved.autoAccept && !autoAccept) return;
                        decline(offer.id);
                        setRemote((cur) =>
                          cur.map((item) =>
                            item.id === offer.id ? { ...item, status: "declined" } : item,
                          ),
                        );
                      }}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-bold"
                    >
                      {o.decline}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-kaenz">{o.matched}</p>
                    <p className="mt-1 text-[11px] text-white/50">
                      {o.seatsLeft}: {Math.max(0, seats)}
                    </p>
                    {offer.extraPassengers.map((pax) => (
                      <p key={pax.id} className="text-[11px] text-white/70">
                        + {pax.name} · {pax.pickup}
                      </p>
                    ))}
                    {seats > 0 ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={o.extraPaxName}
                          className="flex-1 rounded-lg bg-white px-3 py-2 text-sm text-navy outline-none"
                        />
                        <input
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder={o.extraPaxPlace}
                          className="flex-1 rounded-lg bg-white px-3 py-2 text-sm text-navy outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (addPassenger(offer.id, name, pickup)) {
                              setName("");
                              setPickup("");
                            }
                          }}
                          className="rounded-lg bg-kaenz px-3 py-2 text-[11px] font-bold text-white"
                        >
                          {o.extraPax}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
