const base = process.env.BASE || "http://localhost:3011";

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const text = await res.text();
  return {
    status: res.status,
    location: res.headers.get("location") || "",
    text,
  };
}

const payload = {
  yachtId: "galeon",
  kind: "tour",
  hours: 4,
  guests: 4,
  originId: "miami-beach-marina",
  destinationId: "miami-beach-marina",
  full_name: "Guest Test",
  email: "guest@example.com",
};

const cheap = await post("/api/checkout/guest", {
  ...payload,
  amount: 1,
  price: 1,
  total: 1,
});
const yacht = await post("/api/checkout/guest", {
  ...payload,
  yachtId: "not-a-yacht",
});
const email = await post("/api/checkout/guest", {
  ...payload,
  email: "not-an-email",
});
const app = await get("/app/yachts");
const fleet = await get("/fleet");
const galeon = await get("/fleet/galeon");
const canceled = await get("/fleet/galeon?checkout=cancel");
const join = await get("/join");
const confirmed = await get("/book/confirmed");

const sessionId = cheap.json?.sessionId;
let receipt = null;
if (sessionId) {
  const rec = await get(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`);
  receipt = JSON.parse(rec.text);
}

const checks = {
  guestClosed: cheap.status === 410 && yacht.status === 410 && email.status === 410,
  noGuestLoginCopy: !galeon.text.includes("No app login required"),
  appLoginWall:
    app.status === 307 ||
    app.status === 308 ||
    app.location.includes("/login"),
  fleetBookable: fleet.text.includes("Bookable now"),
  fleetNoAppYachts: !fleet.text.includes("/app/yachts"),
  galeonCta:
    galeon.text.includes("/login?next=") && galeon.text.includes("/signup?next="),
  cancelMessage: canceled.text.includes("Checkout was canceled"),
  joinForm: join.text.includes("Apply to join") || join.text.includes("name="),
  joinNotAppPrimary: !join.text.includes("/app/yachts"),
  confirmedPage: confirmed.text.includes("Stripe receipt"),
};

console.log(JSON.stringify({ checks, cheap: cheap.json, receipt }, null, 2));
const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([k]) => k);
if (failed.length) {
  console.error("FAILED", failed);
  process.exit(1);
}
console.log("OK");
