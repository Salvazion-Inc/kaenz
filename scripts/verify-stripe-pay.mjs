// Optional UI smoke test for request → fare split → optional gratuity → Stripe Checkout.
// npm i -D puppeteer-core && node scripts/verify-stripe-pay.mjs
import puppeteer from "puppeteer-core";

const base = "http://127.0.0.1:3010";
const chrome =
  process.env.CHROME ||
  "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe";

const trip = {
  kind: "commute",
  whenMode: "now",
  originId: "miami-beach-marina",
  destinationId: "brickell",
  yachtId: "velocity-38",
  date: "2026-08-27",
  time: "16:00",
  hours: 1,
  guests: 4,
  name: "Pay Test",
  email: "pay@kaenz.dev",
  phone: "+13055550100",
  payMethod: "stripe",
  status: "requested",
  paymentStatus: "unpaid",
  gratuityPct: 0,
  tripProgress: 0,
  rating: 0,
  onboardCrewIds: [],
};

const email = `payui+${Date.now()}@kaenz.dev`;
const signup = await fetch(`${base}/api/auth/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: "Pay Test",
    email,
    password: "kaenztest1",
  }),
});
if (!signup.ok) {
  throw new Error(`signup ${signup.status} ${await signup.text()}`);
}
const setCookies = signup.headers.getSetCookie?.() || [];
if (!setCookies.length) {
  throw new Error("no session cookies");
}

const browser = await puppeteer.launch({
  executablePath: chrome.replace(/\\\\/g, "\\"),
  headless: true,
  args: ["--no-sandbox", "--window-size=390,844"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

for (const raw of setCookies) {
  const [pair] = raw.split(";");
  const eq = pair.indexOf("=");
  const name = pair.slice(0, eq);
  const value = pair.slice(eq + 1);
  await page.setCookie({
    name,
    value,
    url: base,
    httpOnly: raw.toLowerCase().includes("httponly"),
  });
}

await page.goto(`${base}/app/trip`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate((draft) => localStorage.setItem("kaenz-trip-v1", JSON.stringify(draft)), trip);
await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("form", { timeout: 20000 });
await page.waitForFunction(
  () => /Owner \(38%\)/.test(document.body.innerText),
  { timeout: 20000 },
);

const requestText = await page.evaluate(() => document.body.innerText);
const requestChecks = {
  owner: /Owner \(38%\)/.test(requestText),
  captain: /Captain \(30%\)/.test(requestText),
  kaenz: /Kaenz \(25%\)/.test(requestText),
  marinaPickup: /Pickup marina \(3\.5%\)/.test(requestText),
  marinaDropoff: /Dropoff marina \(3\.5%\)/.test(requestText),
  gratuity: /Optional gratuity/.test(requestText),
  custom: /custom\s*%/i.test(requestText),
  total: /Total/.test(requestText),
};

const saved = await page.evaluate(async (profileEmail) => {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      fullName: "Pay Test",
      email: profileEmail,
      phone: "3055550100",
      role: "customer",
      instagram: "",
      city: "Miami",
      cityLat: null,
      cityLng: null,
      solanaWallet: "",
      creditCard: { keep: true },
      debitCard: { keep: true },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}, email);
if (!saved.ok) throw new Error(`profile ${saved.status} ${saved.body}`);

await page.goto(`${base}/app/trip`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(
  () => document.body.innerText.includes("Pay with Stripe"),
  { timeout: 20000 },
);

const tripText = await page.evaluate(() => document.body.innerText);
const tripChecks = {
  stripePay: /Pay with Stripe/.test(tripText),
  split: /captain 30%/.test(tripText),
  gratuity: /Optional gratuity/.test(tripText),
};

const custom = await page.$("input[type=number][max='25']");
if (!custom) throw new Error("missing custom gratuity input");
await custom.click({ clickCount: 3 });
await custom.type("18");
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("button")].some((b) =>
      (b.textContent || "").includes("18%"),
    ) || document.body.innerText.includes("$"),
  { timeout: 8000 },
);

await page.waitForFunction(
  () =>
    [...document.querySelectorAll("button")].some(
      (b) =>
        (b.textContent || "").includes("Pay with Stripe") && !b.disabled,
    ),
  { timeout: 20000 },
);
const checkoutReq = page.waitForResponse(
  (res) => res.url().includes("/api/checkout") && res.request().method() === "POST",
  { timeout: 15000 },
);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent || "").includes("Pay with Stripe") && !b.disabled,
  );
  if (!btn) throw new Error("no enabled Stripe button");
  btn.click();
});
const checkoutRes = await checkoutReq;
const checkoutBody = await checkoutRes.text();
if (checkoutRes.status() !== 503 || !checkoutBody.includes("stripe_unconfigured")) {
  throw new Error(`unexpected checkout ${checkoutRes.status()} ${checkoutBody}`);
}
try {
  await page.waitForFunction(
    () =>
      document.body.innerText.includes("Stripe is not configured") ||
      document.body.innerText.includes("Could not confirm"),
    { timeout: 8000 },
  );
} catch (err) {
  const t = await page.evaluate(() => document.body.innerText);
  throw new Error(`no stripe error after click\n${t.slice(0, 2000)}\n${err}`);
}
const afterPay = await page.evaluate(() => document.body.innerText);
const paidCheck = {
  missingKey: /Stripe is not configured on this server/.test(afterPay),
};

await browser.close();
const result = { requestChecks, tripChecks, paidCheck };
console.log(JSON.stringify(result, null, 2));
const failed = Object.entries({ ...requestChecks, ...tripChecks, ...paidCheck })
  .filter(([, ok]) => !ok)
  .map(([k]) => k);
if (failed.length) {
  console.error("FAILED", failed);
  process.exit(1);
}
console.log("OK");
