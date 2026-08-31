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
  UPLOAD_VIBES,
  type SelfieCircle,
  type TripSelfie,
} from "./selfies";

const KEY = "kaenz-selfies-v1";

type Stored = {
  uploads: TripSelfie[];
  given: string[];
  earned: number;
};

type Ctx = {
  uploads: TripSelfie[];
  given: Record<string, true>;
  earned: number;
  ready: boolean;
  immortalize: (input: {
    photo: string;
    circle: SelfieCircle;
    caption: string;
    name: string;
    place: string;
    city: string;
    tripLabel: string;
  }) => boolean;
  giveVibe: (id: string) => void;
  hasVibed: (id: string) => boolean;
};

const SelfieCtx = createContext<Ctx | null>(null);

function isUpload(value: unknown): value is TripSelfie {
  if (!value || typeof value !== "object") return false;
  const s = value as TripSelfie;
  return Boolean(s.id && s.photo && s.circle);
}

function readLocal(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { uploads: [], given: [], earned: 0 };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      uploads: Array.isArray(parsed.uploads)
        ? parsed.uploads.filter(isUpload)
        : [],
      given: Array.isArray(parsed.given) ? parsed.given.map(String) : [],
      earned: Math.max(0, Number(parsed.earned) || 0),
    };
  } catch {
    return { uploads: [], given: [], earned: 0 };
  }
}

export function SelfieProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<TripSelfie[]>([]);
  const [given, setGiven] = useState<Record<string, true>>({});
  const [earned, setEarned] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readLocal();
    setUploads(stored.uploads);
    setGiven(Object.fromEntries(stored.given.map((id) => [id, true as const])));
    setEarned(stored.earned);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          uploads,
          given: Object.keys(given),
          earned,
        }),
      );
    } catch {
      /* quota */
    }
  }, [uploads, given, earned, ready]);

  const immortalize = useCallback<Ctx["immortalize"]>((input) => {
    const next: TripSelfie = {
      id: `mine-${Date.now()}`,
      photo: input.photo,
      name: input.name,
      city: input.city,
      place: input.place,
      circle: input.circle,
      vibes: UPLOAD_VIBES,
      caption: input.caption || undefined,
      mine: true,
      tripLabel: input.tripLabel,
    };
    let ok = true;
    setUploads((cur) => {
      const merged = [next, ...cur];
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            uploads: merged,
            given: Object.keys(given),
            earned: earned + UPLOAD_VIBES,
          }),
        );
      } catch {
        ok = false;
        return cur;
      }
      return merged;
    });
    if (ok) setEarned((n) => n + UPLOAD_VIBES);
    return ok;
  }, [earned, given]);

  const giveVibe = useCallback((id: string) => {
    setGiven((cur) => {
      const next = { ...cur };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const hasVibed = useCallback((id: string) => Boolean(given[id]), [given]);

  const value = useMemo<Ctx>(
    () => ({
      uploads,
      given,
      earned,
      ready,
      immortalize,
      giveVibe,
      hasVibed,
    }),
    [uploads, given, earned, ready, immortalize, giveVibe, hasVibed],
  );

  return <SelfieCtx.Provider value={value}>{children}</SelfieCtx.Provider>;
}

export function useSelfies() {
  const ctx = useContext(SelfieCtx);
  if (!ctx) throw new Error("useSelfies outside SelfieProvider");
  return ctx;
}

export function vibesOf(selfie: TripSelfie, given: Record<string, true>) {
  return selfie.vibes + (given[selfie.id] ? 1 : 0);
}
