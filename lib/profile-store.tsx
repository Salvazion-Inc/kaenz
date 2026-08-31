"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  hasContact,
  hasPayment,
  preferredPayMethod,
  type CardInput,
  type ProfileRole,
  type UserProfile,
} from "./profile";

export type ProfileSaveInput = {
  fullName: string;
  email: string;
  phone: string;
  role: ProfileRole;
  instagram: string;
  city: string;
  cityLat: number | null;
  cityLng: number | null;
  solanaWallet: string;
  creditCard: CardInput;
  debitCard: CardInput;
};

type Ctx = {
  profile: UserProfile | null;
  ready: boolean;
  complete: boolean;
  hasPayment: boolean;
  preferredPay: "credit" | "debit" | "solana";
  save: (input: ProfileSaveInput) => Promise<UserProfile>;
  refresh: () => Promise<void>;
};

const ProfileCtx = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (input: ProfileSaveInput) => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(String(data.error || "save"));
    }
    const next = data.profile as UserProfile;
    setProfile(next);
    return next;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      profile,
      ready,
      complete: hasContact(profile),
      hasPayment: hasPayment(profile),
      preferredPay: preferredPayMethod(profile),
      save,
      refresh,
    }),
    [profile, ready, save, refresh],
  );

  return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileCtx);
  if (!ctx) throw new Error("useProfile outside ProfileProvider");
  return ctx;
}
