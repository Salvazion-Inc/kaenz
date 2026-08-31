import { NextResponse } from "next/server";
import {
  dbRole,
  emptyProfile,
  parseCardInput,
  parseInstagram,
  parseRole,
  parseWallet,
  PROFILE_COOKIE,
  profileCookie,
  publicProfile,
  readProfileMap,
  sanitizeProfile,
  signProfileMap,
} from "@/lib/profile";
import {
  ACCOUNTS_COOKIE,
  accountsCookie,
  cookieValue,
  createSessionToken,
  readAccounts,
  readSession,
  SESSION_COOKIE,
  sessionCookie,
  signAccounts,
} from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

function sessionFrom(req: Request) {
  return readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
}

async function loadProfile(req: Request, userId: string, fallbackEmail: string) {
  const map = await readProfileMap(
    cookieValue(req.headers.get("cookie"), PROFILE_COOKIE),
  );
  const local = map[userId];
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, email, role, instagram, city, city_lat, city_lng, credit_last4, credit_expiry, credit_brand, debit_last4, debit_expiry, debit_brand, solana_wallet",
        )
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        const fromDb = sanitizeProfile(
          {
            fullName: data.full_name || "",
            email: data.email || fallbackEmail,
            phone: data.phone || "",
            role: parseRole(data.role),
            instagram: data.instagram || "",
            city: data.city || "",
            cityLat: data.city_lat ?? null,
            cityLng: data.city_lng ?? null,
            creditCard:
              data.credit_last4 && data.credit_expiry
                ? {
                    last4: data.credit_last4,
                    expiry: data.credit_expiry,
                    brand: data.credit_brand || "Card",
                  }
                : null,
            debitCard:
              data.debit_last4 && data.debit_expiry
                ? {
                    last4: data.debit_last4,
                    expiry: data.debit_expiry,
                    brand: data.debit_brand || "Card",
                  }
                : null,
            solanaWallet: data.solana_wallet || "",
          },
          emptyProfile({ id: userId, email: fallbackEmail, name: "" }),
        );
        return local
          ? {
              ...fromDb,
              ...sanitizeProfile(local, fromDb),
              creditCard: local.creditCard ?? fromDb.creditCard,
              debitCard: local.debitCard ?? fromDb.debitCard,
            }
          : fromDb;
      }
    } catch {
      /* cookie profile still works */
    }
  }
  return local ?? null;
}

export async function GET(req: Request) {
  const user = await sessionFrom(req);
  if (!user) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  const stored = await loadProfile(req, user.id, user.email);
  const profile = sanitizeProfile(stored, emptyProfile(user));
  return NextResponse.json({ profile: publicProfile(profile) });
}

export async function PUT(req: Request) {
  const user = await sessionFrom(req);
  if (!user) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const current = sanitizeProfile(
    await loadProfile(req, user.id, user.email),
    emptyProfile(user),
  );

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (phone && digitsLen(phone) < 7) {
    return NextResponse.json({ error: "phone" }, { status: 400 });
  }

  const role = parseRole(body.role || current.role);
  const instagram = parseInstagram(String(body.instagram ?? current.instagram));
  if (instagram === "invalid") {
    return NextResponse.json({ error: "instagram" }, { status: 400 });
  }
  const city = String(body.city || "").trim().slice(0, 80);
  const cityLat = numOrNull(body.cityLat);
  const cityLng = numOrNull(body.cityLng);

  const creditCard = parseCardInput(body.creditCard, current.creditCard);
  if (creditCard === "invalid") {
    return NextResponse.json({ error: "credit" }, { status: 400 });
  }
  const debitCard = parseCardInput(body.debitCard, current.debitCard);
  if (debitCard === "invalid") {
    return NextResponse.json({ error: "debit" }, { status: 400 });
  }
  const solanaWallet = parseWallet(String(body.solanaWallet || ""));
  if (solanaWallet === "invalid") {
    return NextResponse.json({ error: "wallet" }, { status: 400 });
  }

  const profile = {
    fullName,
    email,
    phone,
    role,
    instagram,
    city,
    cityLat,
    cityLng,
    creditCard,
    debitCard,
    solanaWallet,
  };

  const map = await readProfileMap(
    cookieValue(req.headers.get("cookie"), PROFILE_COOKIE),
  );
  map[user.id] = profile;
  const ids = Object.keys(map);
  if (ids.length > 25) {
    for (const id of ids.slice(0, ids.length - 25)) delete map[id];
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        phone,
        email,
        credit_last4: creditCard?.last4 ?? null,
        credit_expiry: creditCard?.expiry ?? null,
        credit_brand: creditCard?.brand ?? null,
        debit_last4: debitCard?.last4 ?? null,
        debit_expiry: debitCard?.expiry ?? null,
        debit_brand: debitCard?.brand ?? null,
        solana_wallet: solanaWallet || null,
        role: dbRole(role),
        instagram: instagram || null,
        city: city || null,
        city_lat: cityLat,
        city_lng: cityLng,
      });
    } catch {
      /* cookie is enough */
    }
  }

  const users = await readAccounts(
    cookieValue(req.headers.get("cookie"), ACCOUNTS_COOKIE),
  );
  const account = users.find((u) => u.id === user.id);
  if (account) {
    account.name = fullName;
    if (account.email === user.email) {
      /* keep login email */
    }
  }

  const session = await createSessionToken({
    id: user.id,
    email: user.email,
    name: fullName,
  });
  const vault = await signProfileMap(map);
  const res = NextResponse.json({ profile: publicProfile(profile) });
  res.headers.append("Set-Cookie", sessionCookie(session));
  res.headers.append("Set-Cookie", profileCookie(vault));
  if (account) {
    res.headers.append("Set-Cookie", accountsCookie(await signAccounts(users)));
  }
  return res;
}

function digitsLen(value: string) {
  return value.replace(/\D/g, "").length;
}

function numOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
