import { isSolanaWallet } from "./listings";
import {
  readSignedValue,
  signValue,
  type SessionUser,
} from "./session";

export const PROFILE_COOKIE = "kaenz_profiles";
const DAY = 60 * 60 * 24;

export type SavedCard = {
  last4: string;
  expiry: string;
  brand: string;
};

export const PROFILE_ROLES = ["customer", "owner", "captain"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  role: ProfileRole;
  instagram: string;
  city: string;
  cityLat: number | null;
  cityLng: number | null;
  creditCard: SavedCard | null;
  debitCard: SavedCard | null;
  solanaWallet: string;
};

export type CardInput = { number?: string; expiry?: string; keep?: boolean } | null;

export function emptyProfile(user: SessionUser): UserProfile {
  return {
    fullName: user.name || "",
    email: user.email || "",
    phone: "",
    role: "customer",
    instagram: "",
    city: "",
    cityLat: null,
    cityLng: null,
    creditCard: null,
    debitCard: null,
    solanaWallet: "",
  };
}

export function parseRole(value: unknown): ProfileRole {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "owner" || raw === "captain") return raw;
  if (raw === "both") return "owner";
  return "customer";
}

export function dbRole(role: ProfileRole) {
  return role === "customer" ? "client" : role;
}

export function parseInstagram(value: string): string | "invalid" {
  const raw = value.trim();
  if (!raw) return "";
  const fromUrl = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  let handle = (fromUrl?.[1] || raw).replace(/^@+/, "");
  handle = handle.replace(/[/?#].*$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return "invalid";
  return handle;
}

export function instagramUrl(handle: string) {
  return `https://www.instagram.com/${handle}/`;
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string) {
  const d = digitsOnly(value).slice(0, 19);
  if (d.startsWith("34") || d.startsWith("37")) {
    const a = d.slice(0, 4);
    const b = d.slice(4, 10);
    const c = d.slice(10, 15);
    return [a, b, c].filter(Boolean).join(" ");
  }
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiry(value: string) {
  const d = digitsOnly(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function luhn(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = Number(num[i]);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(value: string) {
  const d = digitsOnly(value);
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(d)) return "Discover";
  if (/^3(?:0[0-5]|[68])/.test(d)) return "Diners";
  if (/^35/.test(d)) return "JCB";
  return "Card";
}

export function isValidCardNumber(value: string) {
  const d = digitsOnly(value);
  if (d.length < 13 || d.length > 19) return false;
  return luhn(d);
}

export function isValidExpiry(value: string) {
  if (!/^\d{2}\/\d{2}$/.test(value)) return false;
  const mm = Number(value.slice(0, 2));
  const yy = Number(value.slice(3));
  if (mm < 1 || mm > 12) return false;
  const exp = new Date(2000 + yy, mm);
  return exp.getTime() > Date.now();
}

export function maskCard(card: SavedCard) {
  return `${card.brand} •••• ${card.last4}`;
}

export function hasContact(profile: UserProfile | null | undefined) {
  return Boolean(profile?.fullName?.trim() && profile?.email?.includes("@"));
}

export function hasPayment(profile: UserProfile | null | undefined) {
  return Boolean(
    profile?.creditCard || profile?.debitCard || profile?.solanaWallet,
  );
}

export function preferredPayMethod(
  profile: UserProfile | null | undefined,
): "credit" | "debit" | "solana" {
  if (profile?.creditCard) return "credit";
  if (profile?.debitCard) return "debit";
  return "solana";
}

function savedCardFromUnknown(value: unknown): SavedCard | null {
  if (!value || typeof value !== "object") return null;
  const card = value as SavedCard;
  const last4 = String(card.last4 || "").replace(/\D/g, "");
  const expiry = String(card.expiry || "");
  const brand = String(card.brand || "Card").slice(0, 20);
  if (last4.length < 3 || last4.length > 4) return null;
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return null;
  return { last4, expiry, brand };
}

export function sanitizeProfile(
  input: Partial<UserProfile> | null | undefined,
  fallback: UserProfile,
): UserProfile {
  const email = String(input?.email ?? fallback.email)
    .trim()
    .toLowerCase();
  const wallet = String(input?.solanaWallet ?? fallback.solanaWallet).trim();
  const lat = input?.cityLat ?? fallback.cityLat;
  const lng = input?.cityLng ?? fallback.cityLng;
  const instagram = parseInstagram(
    String(input?.instagram ?? fallback.instagram),
  );
  return {
    fullName: String(input?.fullName ?? fallback.fullName).trim(),
    email,
    phone: String(input?.phone ?? fallback.phone).trim(),
    role: parseRole(input?.role ?? fallback.role),
    instagram: instagram === "invalid" ? fallback.instagram : instagram,
    city: String(input?.city ?? fallback.city).trim(),
    cityLat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    cityLng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
    creditCard: savedCardFromUnknown(input?.creditCard) ?? null,
    debitCard: savedCardFromUnknown(input?.debitCard) ?? null,
    solanaWallet: wallet,
  };
}

export function parseCardInput(
  input: CardInput | undefined,
  existing: SavedCard | null,
): SavedCard | null | "invalid" {
  if (input == null) return null;
  if (input.keep) return existing;
  const number = String(input.number || "");
  const expiry = String(input.expiry || "").trim();
  if (!digitsOnly(number) && !expiry) return existing;
  if (!isValidCardNumber(number) || !isValidExpiry(expiry)) return "invalid";
  const d = digitsOnly(number);
  return { last4: d.slice(-4), expiry, brand: cardBrand(d) };
}

export function parseWallet(value: string) {
  const wallet = value.trim();
  if (!wallet) return "";
  if (!isSolanaWallet(wallet)) return "invalid" as const;
  return wallet;
}

export async function readProfileMap(
  token: string | undefined | null,
): Promise<Record<string, UserProfile>> {
  const raw = await readSignedValue(token);
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as { profiles?: Record<string, UserProfile> };
    if (!data?.profiles || typeof data.profiles !== "object") return {};
    return data.profiles;
  } catch {
    return {};
  }
}

export async function signProfileMap(profiles: Record<string, UserProfile>) {
  return signValue(JSON.stringify({ profiles }));
}

export function profileCookie(token: string) {
  return `${PROFILE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * DAY}`;
}

export function publicProfile(profile: UserProfile): UserProfile {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    instagram: profile.instagram,
    city: profile.city,
    cityLat: profile.cityLat,
    cityLng: profile.cityLng,
    creditCard: profile.creditCard,
    debitCard: profile.debitCard,
    solanaWallet: profile.solanaWallet,
  };
}
