import {
  Bricolage_Grotesque,
  DM_Sans,
  EB_Garamond,
  Fraunces,
  Lora,
  Manrope,
  Playfair_Display,
  Work_Sans,
} from "next/font/google";
import type { FontId } from "@/sites/fonts";

// Auto-hospedadas no build. preload: false porque cada site usa só 1–2 das 8 famílias;
// o navegador baixa apenas as que forem de fato usadas.
// O next/font exige opções literais em cada chamada (sem objetos compartilhados).
// Toda família nova deve passar por `scripts/font-specimen.mts` (acentos do português).
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-eb-garamond",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-playfair",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-fraunces",
});
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--f-lora" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-bricolage",
});
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-manrope",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-work-sans",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--f-dm-sans",
});

const LOADED: Record<FontId, { variable: string; family: string }> = {
  "eb-garamond": { variable: ebGaramond.variable, family: "var(--f-eb-garamond), Georgia, serif" },
  "playfair-display": { variable: playfair.variable, family: "var(--f-playfair), Georgia, serif" },
  fraunces: { variable: fraunces.variable, family: "var(--f-fraunces), Georgia, serif" },
  lora: { variable: lora.variable, family: "var(--f-lora), Georgia, serif" },
  "bricolage-grotesque": {
    variable: bricolage.variable,
    family: "var(--f-bricolage), system-ui, sans-serif",
  },
  manrope: { variable: manrope.variable, family: "var(--f-manrope), system-ui, sans-serif" },
  "work-sans": { variable: workSans.variable, family: "var(--f-work-sans), system-ui, sans-serif" },
  "dm-sans": { variable: dmSans.variable, family: "var(--f-dm-sans), system-ui, sans-serif" },
};

export function loadedFont(id: FontId) {
  return LOADED[id];
}
