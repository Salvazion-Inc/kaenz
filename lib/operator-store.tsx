"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const KEY = "kaenz-operator-v1";

export type ListedYacht = {
  id: string;
  name: string;
  image: string;
  guests: number;
  marina: string;
};

type State = {
  owner: boolean;
  captain: boolean;
  available: boolean;
  yachts: ListedYacht[];
};

const empty: State = {
  owner: false,
  captain: false,
  available: true,
  yachts: [],
};

type Ctx = State & {
  ready: boolean;
  enrollOwner: (yacht: ListedYacht) => void;
  enrollCaptain: () => void;
  setAvailable: (on: boolean) => void;
};

const Ctx = createContext<Ctx | null>(null);

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<State>;
    return {
      owner: Boolean(p.owner),
      captain: Boolean(p.captain),
      available: p.available !== false,
      yachts: Array.isArray(p.yachts) ? p.yachts : [],
    };
  } catch {
    return empty;
  }
}

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, ready]);

  const enrollOwner = useCallback((yacht: ListedYacht) => {
    setState((cur) => ({
      ...cur,
      owner: true,
      yachts: [yacht, ...cur.yachts.filter((item) => item.id !== yacht.id)],
    }));
  }, []);

  const enrollCaptain = useCallback(() => {
    setState((cur) => ({ ...cur, captain: true, available: true }));
  }, []);

  const setAvailable = useCallback((on: boolean) => {
    setState((cur) => ({ ...cur, available: on }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...state, ready, enrollOwner, enrollCaptain, setAvailable }),
    [state, ready, enrollOwner, enrollCaptain, setAvailable],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOperator() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOperator outside OperatorProvider");
  return ctx;
}
