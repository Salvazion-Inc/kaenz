import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectActiveTrip } from "./active-trip.ts";

const today = new Date("2026-10-20T15:00:00");

test("an active trip comes only from a stored booking for today", () => {
  assert.equal(selectActiveTrip([], today), null);
  assert.equal(
    selectActiveTrip(
      [
        {
          id: "old",
          date: "2026-10-19",
          origin: "Miami Beach Marina",
          destination: "Island Gardens",
          status: "confirmed",
        },
      ],
      today,
    ),
    null,
  );
  assert.equal(
    selectActiveTrip(
      [
        {
          id: "draft",
          date: "2026-10-20",
          origin: "Miami Beach Marina",
          destination: "Island Gardens",
          status: "draft",
        },
      ],
      today,
    ),
    null,
  );
  assert.deepEqual(
    selectActiveTrip(
      [
        {
          id: "bk_1",
          date: "2026-10-20",
          time: "16:00",
          origin: "Las Olas Marina",
          destination: "Palm Beach Town Docks",
          status: "confirmed",
        },
      ],
      today,
    ),
    { origin: "Las Olas Marina", destination: "Palm Beach Town Docks" },
  );
});

test("signup shows Check your email instead of an empty login", () => {
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("../components/VerifyEmailScreen.tsx", import.meta.url), "utf8");
  const copy = readFileSync(new URL("./copy.ts", import.meta.url), "utf8");
  assert.match(form, /\/check-email\?email=/);
  assert.equal(form.includes('router.replace("/app")'), false);
  assert.match(screen, /checkEmailTitle/);
  assert.match(screen, /\/api\/auth\/verify-email/);
  assert.equal(copy.includes('checkEmailTitle: "Check your email"'), true);
});

test("the app map does not draw the demo Miami Beach trip", () => {
  const map = readFileSync(new URL("../components/WorldMap.tsx", import.meta.url), "utf8");
  const places = readFileSync(new URL("../components/app/PlacesTab.tsx", import.meta.url), "utf8");
  assert.match(map, /if \(variant === "app"\) return/);
  assert.match(map, /activeTrip\.origin/);
  assert.match(map, /href="\/fleet"/);
  assert.match(places, /selectActiveTrip/);
  assert.match(places, /\/api\/trips/);
});
