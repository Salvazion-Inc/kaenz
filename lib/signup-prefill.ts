const ROLES = ["owner", "captain", "marina"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PartnerRole = (typeof ROLES)[number];

export type SignupPrefill = {
  role: PartnerRole | "";
  email: string;
  name: string;
  yacht: string;
  marina: string;
};

export const EMPTY_SIGNUP_PREFILL: SignupPrefill = {
  role: "",
  email: "",
  name: "",
  yacht: "",
  marina: "",
};

function clip(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export function parseSignupPrefill(input: {
  role?: unknown;
  email?: unknown;
  name?: unknown;
  yacht?: unknown;
  marina?: unknown;
}): SignupPrefill {
  const roleRaw = clip(input.role, 20).toLowerCase();
  const role = ROLES.includes(roleRaw as PartnerRole) ? (roleRaw as PartnerRole) : "";
  const emailRaw = clip(input.email, 120).toLowerCase();
  return {
    role,
    email: EMAIL.test(emailRaw) ? emailRaw : "",
    name: clip(input.name, 80),
    yacht: clip(input.yacht, 80),
    marina: clip(input.marina, 80),
  };
}

export const ONBOARDING_COOKIE = "kaenz_onboarding";

export function onboardingCookie(prefill: SignupPrefill) {
  if (!prefill.role && !prefill.yacht && !prefill.marina) return "";
  // Role plus the yacht or marina being listed. Never the person's name or email.
  const payload = {
    role: prefill.role,
    yacht: prefill.yacht,
    marina: prefill.marina,
  };
  return `${ONBOARDING_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function readOnboardingIntent(cookieHeader: string): SignupPrefill {
  const match = cookieHeader.match(/(?:^|;\s*)kaenz_onboarding=([^;]*)/);
  if (!match) return EMPTY_SIGNUP_PREFILL;
  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  try {
    const json = JSON.parse(raw) as {
      role?: unknown;
      yacht?: unknown;
      marina?: unknown;
    };
    return { ...parseSignupPrefill(json), name: "", email: "" };
  } catch {
    return EMPTY_SIGNUP_PREFILL;
  }
}
