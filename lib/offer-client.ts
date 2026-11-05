export type OfferGate = {
  ok: boolean;
  autoAccept: boolean;
  accepted: boolean;
  mine: boolean;
  yachtId: string;
  id: string;
  offers: Array<{
    id: string;
    customerName: string;
    yachtId: string;
    originName: string;
    destName: string;
    guests: number;
    kind: string;
    hours: number;
    status: "offered" | "accepted" | "declined";
  }>;
};

function emptyGate(offerId = ""): OfferGate {
  return {
    ok: false,
    autoAccept: false,
    accepted: false,
    mine: false,
    yachtId: "",
    id: offerId,
    offers: [],
  };
}

export async function fetchOfferGate(offerId = ""): Promise<OfferGate> {
  const query = offerId ? `?id=${encodeURIComponent(offerId)}` : "";
  try {
    const res = await fetch(`/api/offers${query}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const offers = Array.isArray(data.offers) ? data.offers : [];
    return {
      ok: res.ok,
      autoAccept: data.autoAccept === true,
      accepted: data.accepted === true && data.mine === true,
      mine: data.mine === true,
      yachtId: String(data.yachtId || ""),
      id: String(data.id || offerId || ""),
      offers: offers.map((row: Record<string, unknown>) => ({
        id: String(row.id || ""),
        customerName: String(row.customerName || ""),
        yachtId: String(row.yachtId || ""),
        originName: String(row.originName || ""),
        destName: String(row.destName || ""),
        guests: Number(row.guests) || 0,
        kind: String(row.kind || ""),
        hours: Number(row.hours) || 0,
        status:
          row.status === "accepted" || row.status === "declined"
            ? row.status
            : "offered",
      })),
    };
  } catch {
    return emptyGate(offerId);
  }
}

export async function postTripOffer(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok && typeof data.id === "string" && data.id.length > 0,
      id: String(data.id || ""),
      autoAccept: data.autoAccept === true,
      status: res.status,
      error: String(data.error || ""),
    };
  } catch {
    return { ok: false, id: "", autoAccept: false, status: 0, error: "" };
  }
}

async function postOfferAction(path: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok && data.accepted === true,
      declined: res.ok && data.status === "declined",
      autoAccept: data.autoAccept === true,
    };
  } catch {
    return { ok: false, declined: false, autoAccept: false };
  }
}

export function postOfferAccept(id: string, yachtId: string) {
  return postOfferAction("/api/offers/accept", { id, yachtId });
}

export function postOfferDecline(id: string) {
  return postOfferAction("/api/offers/decline", { id });
}
