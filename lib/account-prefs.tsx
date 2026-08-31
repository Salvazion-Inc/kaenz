"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const PALETTE_IDS = ["classic", "aqua", "tide", "dusk", "gold"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export type KaenzPalette = {
  id: PaletteId;
  kaenz: string;
  kaenzDeep: string;
  navy: string;
  navy2: string;
  foam: string;
};

export const PALETTES: Record<PaletteId, KaenzPalette> = {
  classic: {
    id: "classic",
    kaenz: "#00a1d6",
    kaenzDeep: "#0189b8",
    navy: "#050a30",
    navy2: "#0a1450",
    foam: "#f4f6fc",
  },
  aqua: {
    id: "aqua",
    kaenz: "#2ec8e6",
    kaenzDeep: "#14a8c8",
    navy: "#061033",
    navy2: "#0c1c58",
    foam: "#f7fbff",
  },
  tide: {
    id: "tide",
    kaenz: "#0093c4",
    kaenzDeep: "#00749c",
    navy: "#04091f",
    navy2: "#081038",
    foam: "#eef3fa",
  },
  dusk: {
    id: "dusk",
    kaenz: "#1eb4e0",
    kaenzDeep: "#0e8fb6",
    navy: "#070b38",
    navy2: "#12185a",
    foam: "#f2f5ff",
  },
  gold: {
    id: "gold",
    kaenz: "#d4a84b",
    kaenzDeep: "#b8892e",
    navy: "#050a30",
    navy2: "#0a1450",
    foam: "#f7f4ea",
  },
};

export const FONT_SCALE: Record<FontSize, string> = {
  sm: "0.9",
  md: "1",
  lg: "1.12",
  xl: "1.22",
};

const PHOTO_KEY = "kaenz-avatar-v1";
const LOOK_KEY = "kaenz-look-v1";

type Look = {
  font: FontSize;
  palette: PaletteId;
};

const DEFAULT_LOOK: Look = { font: "md", palette: "classic" };

type Ctx = {
  photo: string;
  font: FontSize;
  palette: PaletteId;
  ready: boolean;
  setPhoto: (dataUrl: string) => boolean;
  removePhoto: () => void;
  setFont: (size: FontSize) => void;
  setPalette: (id: PaletteId) => void;
};

const PrefsCtx = createContext<Ctx | null>(null);

function parseFont(value: unknown): FontSize {
  return FONT_SIZES.includes(value as FontSize) ? (value as FontSize) : "md";
}

function parsePalette(value: unknown): PaletteId {
  return PALETTE_IDS.includes(value as PaletteId)
    ? (value as PaletteId)
    : "classic";
}

function readLook(): Look {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    if (!raw) return DEFAULT_LOOK;
    const parsed = JSON.parse(raw) as Partial<Look>;
    return {
      font: parseFont(parsed.font),
      palette: parsePalette(parsed.palette),
    };
  } catch {
    return DEFAULT_LOOK;
  }
}

function applyLook(look: Look) {
  const root = document.documentElement;
  const palette = PALETTES[look.palette];
  root.style.setProperty("--color-kaenz", palette.kaenz);
  root.style.setProperty("--color-kaenz-deep", palette.kaenzDeep);
  root.style.setProperty("--color-navy", palette.navy);
  root.style.setProperty("--color-navy-2", palette.navy2);
  root.style.setProperty("--color-foam", palette.foam);
  root.style.setProperty("--kaenz-text", FONT_SCALE[look.font]);
}

export function AccountPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [photo, setPhotoState] = useState("");
  const [font, setFontState] = useState<FontSize>("md");
  const [palette, setPaletteState] = useState<PaletteId>("classic");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPhotoState(localStorage.getItem(PHOTO_KEY) || "");
    } catch {
      setPhotoState("");
    }
    const look = readLook();
    setFontState(look.font);
    setPaletteState(look.palette);
    applyLook(look);
    setReady(true);
  }, []);

  const persistLook = useCallback((next: Look) => {
    setFontState(next.font);
    setPaletteState(next.palette);
    applyLook(next);
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(next));
    } catch {
      /* quota */
    }
  }, []);

  const setPhoto = useCallback((dataUrl: string) => {
    try {
      localStorage.setItem(PHOTO_KEY, dataUrl);
    } catch {
      return false;
    }
    setPhotoState(dataUrl);
    return true;
  }, []);

  const removePhoto = useCallback(() => {
    try {
      localStorage.removeItem(PHOTO_KEY);
    } catch {
      /* ignore */
    }
    setPhotoState("");
  }, []);

  const setFont = useCallback(
    (size: FontSize) => {
      persistLook({ font: size, palette });
    },
    [palette, persistLook],
  );

  const setPalette = useCallback(
    (id: PaletteId) => {
      persistLook({ font, palette: id });
    },
    [font, persistLook],
  );

  const value = useMemo<Ctx>(
    () => ({
      photo,
      font,
      palette,
      ready,
      setPhoto,
      removePhoto,
      setFont,
      setPalette,
    }),
    [photo, font, palette, ready, setPhoto, removePhoto, setFont, setPalette],
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function useAccountPrefs() {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error("useAccountPrefs outside AccountPrefsProvider");
  return ctx;
}

export const APPLY_LOOK_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${LOOK_KEY}")||"{}");var p={classic:["#00a1d6","#0189b8","#050a30","#0a1450","#f4f6fc"],aqua:["#2ec8e6","#14a8c8","#061033","#0c1c58","#f7fbff"],tide:["#0093c4","#00749c","#04091f","#081038","#eef3fa"],dusk:["#1eb4e0","#0e8fb6","#070b38","#12185a","#f2f5ff"],gold:["#d4a84b","#b8892e","#050a30","#0a1450","#f7f4ea"]}[s.palette]||["#00a1d6","#0189b8","#050a30","#0a1450","#f4f6fc"];var f={sm:"0.9",md:"1",lg:"1.12",xl:"1.22"}[s.font]||"1";var r=document.documentElement;r.style.setProperty("--color-kaenz",p[0]);r.style.setProperty("--color-kaenz-deep",p[1]);r.style.setProperty("--color-navy",p[2]);r.style.setProperty("--color-navy-2",p[3]);r.style.setProperty("--color-foam",p[4]);r.style.setProperty("--kaenz-text",f);}catch(e){}})();`;
