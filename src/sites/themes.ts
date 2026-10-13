import type { Theme } from "./bio";

type ThemePreset = {
  label: string;
  theme: Omit<Theme, "pattern">;
  ticker: { bg: string; fg: string };
};

/** Paletas prontas (contraste AA verificado em teste). O padrão ilustrado vem do segmento. */
export const THEMES = {
  ambar: {
    label: "Âmbar",
    theme: {
      colors: {
        base: "#2e1708",
        cardTop: "#9a4f0e",
        cardBottom: "#6b3408",
        accent: "#ffd89a",
        ink: "#2b1a0e",
        inkMuted: "#6b4c35",
        logoBg: "#fff4e2",
        logoFg: "#8a440e",
        glow1: "#e3a24a",
        glow2: "#f5d7a1",
        glow3: "#8a4a1c",
      },
      fonts: { display: "fraunces", body: "manrope" },
      radius: "soft",
    },
    ticker: { bg: "#ffd89a", fg: "#3b2414" },
  },
  ameixa: {
    label: "Ameixa",
    theme: {
      colors: {
        base: "#2a0d1f",
        cardTop: "#8f3765",
        cardBottom: "#561840",
        accent: "#ffd0e4",
        ink: "#2a1220",
        inkMuted: "#74505f",
        logoBg: "#ffe9f2",
        logoFg: "#7d2a5a",
        glow1: "#c45b8f",
        glow2: "#f0c3a8",
        glow3: "#5b2245",
      },
      fonts: { display: "bricolage-grotesque", body: "manrope" },
      radius: "pill",
    },
    ticker: { bg: "#f6cfe0", fg: "#5b2245" },
  },
  esmeralda: {
    label: "Esmeralda",
    theme: {
      colors: {
        base: "#082a26",
        cardTop: "#13695d",
        cardBottom: "#0b4a42",
        accent: "#bff0e6",
        ink: "#10302b",
        inkMuted: "#4f6d67",
        logoBg: "#e3f4f1",
        logoFg: "#0f5e56",
        glow1: "#3fb3a0",
        glow2: "#cfeee7",
        glow3: "#0f5e56",
      },
      fonts: { display: "fraunces", body: "manrope" },
      radius: "square",
    },
    ticker: { bg: "#bff0e6", fg: "#0b4a42" },
  },
  oceano: {
    label: "Oceano",
    theme: {
      colors: {
        base: "#071a33",
        cardTop: "#1b56a0",
        cardBottom: "#0f3a73",
        accent: "#bcd8ff",
        ink: "#0d2340",
        inkMuted: "#4a5f7c",
        logoBg: "#e6f1ff",
        logoFg: "#174a8a",
        glow1: "#2f7fd6",
        glow2: "#bfe0ff",
        glow3: "#0f3a73",
      },
      fonts: { display: "dm-sans", body: "dm-sans" },
      radius: "soft",
    },
    ticker: { bg: "#bcd8ff", fg: "#0d2340" },
  },
  grafite: {
    label: "Grafite",
    theme: {
      colors: {
        base: "#15171c",
        cardTop: "#3b4250",
        cardBottom: "#23272f",
        accent: "#c9d3e3",
        ink: "#1b1f27",
        inkMuted: "#545c6b",
        logoBg: "#eef2f8",
        logoFg: "#2b3340",
        glow1: "#4b5567",
        glow2: "#a7b4c8",
        glow3: "#23272f",
      },
      fonts: { display: "work-sans", body: "work-sans" },
      radius: "soft",
    },
    ticker: { bg: "#e8edf5", fg: "#1b1f27" },
  },
} as const satisfies Record<string, ThemePreset>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as [ThemeId, ...ThemeId[]];
