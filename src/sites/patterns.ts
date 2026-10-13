/** Padrões ilustrados (desenhos próprios) aplicados sobre o topo do Bio Site. */
const svg = (inner: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='none' stroke='#ffffff' stroke-opacity='.13' stroke-width='3' stroke-linecap='round'>${inner}</svg>`,
  )}")`;

export const PATTERNS = {
  none: { label: "Sem padrão", css: "none" },
  food: {
    label: "Alimentação",
    css: svg(
      "<path d='M18 40c6-14 30-14 36 0'/><path d='M26 33v8M36 30v10M46 33v8'/><circle cx='88' cy='86' r='14'/><path d='M80 86h16M88 78v16'/>",
    ),
  },
  beauty: {
    label: "Beleza",
    css: svg(
      "<circle cx='22' cy='26' r='7'/><circle cx='22' cy='50' r='7'/><path d='M28 30l26 14M28 46l26-14'/><path d='M90 76v20M80 86h20M83 79l14 14M97 79L83 93'/>",
    ),
  },
  health: {
    label: "Saúde",
    css: svg(
      "<path d='M30 18v24M18 30h24'/><path d='M78 96c0-18 12-28 24-28 0 16-10 28-24 28z'/><path d='M78 96c6-8 12-14 20-20'/>",
    ),
  },
  dots: {
    label: "Pontos",
    css: svg(
      "<circle cx='30' cy='30' r='3'/><circle cx='90' cy='90' r='3'/><circle cx='90' cy='30' r='1.5'/><circle cx='30' cy='90' r='1.5'/>",
    ),
  },
} as const;

export type PatternId = keyof typeof PATTERNS;
export const PATTERN_IDS = Object.keys(PATTERNS) as [PatternId, ...PatternId[]];
