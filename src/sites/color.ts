export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG 2.x). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** Razão de contraste WCAG entre duas cores `#rrggbb` (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Mistura `over` sobre `base` com opacidade `alpha` (0 a 1). */
export function mixHex(base: string, over: string, alpha: number): string {
  const [b, o] = [rgb(base), rgb(over)];
  return toHex(b.map((v, i) => v * (1 - alpha) + o[i] * alpha));
}

/** Média simples das cores (aproxima o fundo desfocado, onde as cores se misturam). */
export function averageHex(colors: string[]): string {
  const all = colors.map(rgb);
  return toHex([0, 1, 2].map((i) => all.reduce((s, c) => s + c[i], 0) / all.length));
}

/** Converte `#rrggbb` + opacidade em `rgb(r g b / a)` para CSS. */
export function rgbaCss(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgb(${r} ${g} ${b} / ${Math.round(alpha * 100) / 100})`;
}
