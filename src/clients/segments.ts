import type { PatternId } from "@/sites/patterns";
import type { ThemeId } from "@/sites/themes";

export const SEGMENTS = {
  food: { label: "Alimentação", theme: "ambar", pattern: "food" },
  beauty: { label: "Beleza", theme: "ameixa", pattern: "beauty" },
  health: { label: "Saúde", theme: "esmeralda", pattern: "health" },
  services: { label: "Serviços", theme: "oceano", pattern: "dots" },
  other: { label: "Outro", theme: "grafite", pattern: "none" },
} as const satisfies Record<string, { label: string; theme: ThemeId; pattern: PatternId }>;

export type SegmentId = keyof typeof SEGMENTS;
export const SEGMENT_IDS = Object.keys(SEGMENTS) as [SegmentId, ...SegmentId[]];

export function isSegment(value: string): value is SegmentId {
  return Object.hasOwn(SEGMENTS, value);
}
