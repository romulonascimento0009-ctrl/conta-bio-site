import type { AssetInfo } from "@/data/assets";
import type { SiteDocument } from "@/sites/document";

export type RenderContext = {
  doc: SiteDocument;
  assets: Map<string, AssetInfo>;
  /** Destino do botão "Agendar". */
  booking: string;
  /** Classe de peso/ritmo dos títulos conforme a família (serifa x sem serifa). */
  headingClass: string;
};
