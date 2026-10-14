import type { PatternId } from "@/sites/patterns";
import type { ThemeId } from "@/sites/themes";

// Bio Sites novos nascem sem padrão ilustrado (só o fundo desfocado); os desenhos continuam
// disponíveis em Aparência → Padrão ilustrado (pedido do usuário, 2026-10-13).
export const SEGMENTS = {
  food: { label: "Alimentação", theme: "ambar", pattern: "none" },
  beauty: { label: "Beleza", theme: "ameixa", pattern: "none" },
  health: { label: "Saúde", theme: "esmeralda", pattern: "none" },
  services: { label: "Serviços", theme: "oceano", pattern: "none" },
  other: { label: "Outro", theme: "grafite", pattern: "none" },
} as const satisfies Record<string, { label: string; theme: ThemeId; pattern: PatternId }>;

export type SegmentId = keyof typeof SEGMENTS;
export const SEGMENT_IDS = Object.keys(SEGMENTS) as [SegmentId, ...SegmentId[]];

export function isSegment(value: string): value is SegmentId {
  return Object.hasOwn(SEGMENTS, value);
}
