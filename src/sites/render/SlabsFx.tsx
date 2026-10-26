import type { CSSProperties } from "react";

/**
 * Efeito "placas" do visual padrão (Reistyle, D53; protótipo `prototipos/bio-site-reistyle.html`,
 * vídeo de referência do usuário): placas escuras em ângulo que deslizam e giram devagar sobre o
 * fundo, com uma linha fina nas quinas e uma luz que corre por elas, nas cores da borda
 * (`--fx-a`, `--fx-b`). Só SVG e CSS (transform, opacity, stroke-dashoffset); parado para quem
 * desligou as animações. O fundo da página aproxima devagar (bio.css, .bio--fx-slabs).
 */

type Seam = { d: string; glow: string; dur: string; delay?: string };

/** Placa de baixo (fica atrás) e placa de cima, que desliza sobre ela; cada uma com suas quinas. */
const LOWER = {
  planes: [
    { opacity: 0.68, points: "-60,100 215,330 160,780 -60,780" },
    { opacity: 0.18, points: "215,330 460,500 460,780 160,780" },
  ],
  seams: [{ d: "M215 330L160 780", glow: "M221 331L166 781", dur: "7s", delay: "-3s" }] as Seam[],
};
const UPPER = {
  planes: [
    { opacity: 0.5, points: "-60,-60 262,-60 460,40 460,500 -60,100" },
    { opacity: 0.22, points: "262,-60 460,-60 460,40" },
    { opacity: 0.14, points: "300,18 405,272 460,500 300,390" },
  ],
  seams: [
    { d: "M-60 100L460 500", glow: "M-64 105L456 505", dur: "9s" },
    { d: "M262 -60L460 40", glow: "M259 -55L457 45", dur: "6s", delay: "-1s" },
    { d: "M300 18L405 272", glow: "M295 20L400 274", dur: "8s", delay: "-5s" },
  ] as Seam[],
};

function Slab({ className, slab }: { className: string; slab: typeof UPPER }) {
  return (
    <g className={className}>
      {slab.planes.map((p) => (
        <polygon key={p.points} className="bio-slab-plane" opacity={p.opacity} points={p.points} />
      ))}
      {slab.seams.map((s) => (
        <g key={s.d} style={{ "--d": s.dur, "--w": s.delay ?? "0s" } as CSSProperties}>
          <path className="bio-slab-seam" d={s.d} />
          <path className="bio-slab-glow" pathLength={100} d={s.glow} />
          <path className="bio-slab-core" pathLength={100} d={s.d} />
        </g>
      ))}
    </g>
  );
}

export function SlabsFx() {
  return (
    <div className="bio-fx bio-slabs" aria-hidden="true">
      <svg viewBox="0 0 400 712" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="bio-slab-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <Slab className="bio-slab s2" slab={LOWER} />
        <Slab className="bio-slab s1" slab={UPPER} />
      </svg>
    </div>
  );
}
