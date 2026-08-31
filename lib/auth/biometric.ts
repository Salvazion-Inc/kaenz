/**
 * Device biometric unlock for Kaenz (thumb / fingerprint / Face ID / Windows Hello).
 * WebAuthn platform authenticator; the session token is stored only after the
 * user enables the feature, and is cleared on sign-out.
 */

export const BIOMETRIC_STATE_KEY = "kaenz.biometric.state";
export const BIOMETRIC_VAULT_KEY = "kaenz.biometric.vault";
export const BIOMETRIC_PROMPT_DISMISS_KEY = "kaenz.biometric.promptDismissed";
export const BIOMETRIC_CHANGED_EVENT = "kaenz:biometric-changed";

export type BiometryKind = "fingerprint" | "face" | "pin" | "none";

export type BiometricCapability = {
  available: boolean;
  kind: BiometryKind;
};

export type BiometricState = {
  enabled: boolean;
  email: string;
  userId: string;
  credentialId?: string;
  enrolledAt: number;
};

export type BiometricVault = {
  token: string;
  email: string;
};

export class BiometricCancelledError extends Error {
  constructor(message = "cancelled") {
    super(message);
    this.name = "BiometricCancelledError";
  }
}

export class BiometricUnavailableError extends Error {
  constructor(message = "unavailable") {
    super(message);
    this.name = "BiometricUnavailableError";
  }
}

function canUseDom() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emitChanged() {
  if (!canUseDom()) return;
  try {
    window.dispatchEvent(new CustomEvent(BIOMETRIC_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeBiometricChanged(cb: () => void) {
  if (!canUseDom()) return () => {};
  const handler = () => cb();
  window.addEventListener(BIOMETRIC_CHANGED_EVENT, handler);
  return () => window.removeEventListener(BIOMETRIC_CHANGED_EVENT, handler);
}

function readJson<T>(key: string): T | null {
  if (!canUseDom()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseDom()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getBiometricState(): BiometricState | null {
  const state = readJson<BiometricState>(BIOMETRIC_STATE_KEY);
  if (!state?.enabled || !state.userId) return null;
  return state;
}

export function isBiometricEnabled() {
  return getBiometricState()?.enabled === true && !!readJson<BiometricVault>(BIOMETRIC_VAULT_KEY);
}

export function getBiometricVault(): BiometricVault | null {
  const vault = readJson<BiometricVault>(BIOMETRIC_VAULT_KEY);
  if (!vault?.token) return null;
  return vault;
}

export function persistBiometricVault(token: string, email: string) {
  if (!token) return;
  writeJson(BIOMETRIC_VAULT_KEY, { token, email } satisfies BiometricVault);
}

export function isBiometricPromptDismissed() {
  if (!canUseDom()) return false;
  return localStorage.getItem(BIOMETRIC_PROMPT_DISMISS_KEY) === "1";
}

export function dismissBiometricPrompt() {
  if (!canUseDom()) return;
  localStorage.setItem(BIOMETRIC_PROMPT_DISMISS_KEY, "1");
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomChallenge() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function rpId() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return host;
  return host;
}

function isWebAuthnApiPresent() {
  return (
    canUseDom() &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (!isWebAuthnApiPresent()) {
    return { available: false, kind: "none" };
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!ok) return { available: false, kind: "none" };
    }
  } catch {
    /* treat as available and let the prompt fail */
  }
  return { available: true, kind: "fingerprint" };
}

function isCancelError(err: unknown) {
  if (!err) return false;
  if (err instanceof BiometricCancelledError) return true;
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  const blob = `${name} ${message}`.toLowerCase();
  return (
    name === "NotAllowedError" ||
    name === "AbortError" ||
    blob.includes("cancel") ||
    blob.includes("notallowed") ||
    blob.includes("user canceled") ||
    blob.includes("user cancelled")
  );
}

let verifyLock: Promise<void> | null = null;

async function createWebAuthnCredential(userId: string, email: string) {
  const userIdBytes = new TextEncoder().encode(userId).slice(0, 64);
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge() as BufferSource,
      rp: { name: "Kaenz", id: rpId() },
      user: {
        id: userIdBytes as BufferSource,
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!cred?.rawId) throw new BiometricUnavailableError("no-credential");
  return bytesToBase64Url(cred.rawId);
}

async function assertWebAuthnCredential(credentialId?: string) {
  const allowCredentials = credentialId
    ? [
        {
          type: "public-key" as const,
          id: base64UrlToBytes(credentialId) as BufferSource,
          transports: ["internal" as const],
        },
      ]
    : undefined;

  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge() as BufferSource,
      rpId: rpId(),
      allowCredentials,
      userVerification: "required",
      timeout: 60_000,
    },
    mediation: "required",
  });

  if (!cred) throw new BiometricCancelledError();
}

export async function enrollBiometric(input: {
  userId: string;
  email: string;
  token: string;
  reason: string;
}): Promise<BiometricCapability> {
  const cap = await getBiometricCapability();
  if (!cap.available) throw new BiometricUnavailableError();

  let credentialId: string | undefined;
  try {
    credentialId = await createWebAuthnCredential(input.userId, input.email);
  } catch (err) {
    if (isCancelError(err)) throw new BiometricCancelledError();
    throw err;
  }

  writeJson(BIOMETRIC_STATE_KEY, {
    enabled: true,
    email: input.email,
    userId: input.userId,
    credentialId,
    enrolledAt: Date.now(),
  } satisfies BiometricState);
  persistBiometricVault(input.token, input.email);
  if (canUseDom()) localStorage.removeItem(BIOMETRIC_PROMPT_DISMISS_KEY);
  emitChanged();
  return cap;
}

export async function verifyBiometric() {
  if (verifyLock) return verifyLock;
  verifyLock = (async () => {
    const cap = await getBiometricCapability();
    if (!cap.available) throw new BiometricUnavailableError();
    const state = getBiometricState();
    try {
      await assertWebAuthnCredential(state?.credentialId);
    } catch (err) {
      if (isCancelError(err)) throw new BiometricCancelledError();
      throw err;
    }
  })().finally(() => {
    verifyLock = null;
  });
  return verifyLock;
}

export async function unlockWithBiometric(): Promise<BiometricVault> {
  if (!isBiometricEnabled()) throw new BiometricUnavailableError("not-enrolled");
  await verifyBiometric();
  const vault = getBiometricVault();
  if (!vault) throw new BiometricUnavailableError("empty-vault");
  return vault;
}

export function disableBiometric() {
  if (!canUseDom()) return;
  localStorage.removeItem(BIOMETRIC_STATE_KEY);
  localStorage.removeItem(BIOMETRIC_VAULT_KEY);
  emitChanged();
}
