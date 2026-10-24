"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Efeito "glitter" do visual padrão (protótipo `prototipos/bio-site-mage-beauty.html`, vídeo de
 * referência do usuário): pontos de glitter caindo em velocidades diferentes e cintilando, alguns
 * desfocados e poucos com brilho em cruz, mais pétalas caindo. Camada parada atrás do conteúdo.
 * Cores: branco contornado na cor do texto dos painéis (`outline`) e as cores da borda (`colors`).
 * Quem desligou as animações vê o glitter parado e sem pétalas.
 */

type Part = {
  x: number;
  y: number;
  s: number;
  v: number;
  dx: number;
  ph: number;
  tw: number;
  c: string;
  kind: "dot" | "star" | "bokeh";
};

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

const PETALS = [
  { left: "8%", d: "12s", dx: "60px", delay: "0s" },
  { left: "30%", d: "14s", dx: "-40px", s: "16px", delay: "3s" },
  { left: "55%", d: "11s", dx: "50px", s: "26px", delay: "6s" },
  { left: "78%", d: "13s", dx: "-60px", delay: "1.5s" },
  { left: "92%", d: "15s", dx: "-30px", s: "18px", delay: "8s" },
  { left: "44%", d: "16s", dx: "70px", s: "14px", delay: "10s" },
];

export function GlitterFx({ colors, outline }: { colors: string[]; outline: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = colors.join("|");

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const white = "255,255,255";
    const palette = [white, white, white, ...key.split("|").map(rgb)];
    const ring = rgb(outline);
    let w = 0;
    let h = 0;
    let parts: Part[] = [];
    let raf = 0;
    const make = (y?: number): Part => {
      const r = Math.random();
      const kind = r < 0.06 ? "bokeh" : r < 0.1 ? "star" : "dot";
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        s:
          kind === "bokeh"
            ? 3 + Math.random() * 5
            : kind === "star"
              ? 1.6 + Math.random()
              : 0.5 + Math.random() * 1.6,
        v: 18 + Math.random() * 70,
        dx: (Math.random() - 0.5) * 12,
        ph: Math.random() * 6.28,
        tw: 2 + Math.random() * 5,
        c: palette[Math.floor(Math.random() * palette.length)],
        kind,
      };
    };
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round((w * h) / 320) }, () => make());
    };
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        if (!still) {
          p.y += p.v * dt;
          p.x += p.dx * dt;
          if (p.y > h + 10) Object.assign(p, make(-10));
        }
        const a = (0.45 + 0.55 * Math.abs(Math.sin(p.ph + (now / 1000) * p.tw))) * 0.85;
        ctx.beginPath();
        if (p.kind === "bokeh") {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2);
          g.addColorStop(0, `rgba(${p.c},${a * 0.55})`);
          g.addColorStop(1, `rgba(${p.c},0)`);
          ctx.fillStyle = g;
          ctx.arc(p.x, p.y, p.s * 2, 0, 6.28);
          ctx.fill();
          continue;
        }
        ctx.fillStyle = `rgba(${p.c},${a})`;
        ctx.arc(p.x, p.y, p.s, 0, 6.28);
        ctx.fill();
        if (p.c === white) {
          ctx.strokeStyle = `rgba(${ring},${a * 0.55})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        if (p.kind === "star") {
          ctx.fillStyle = `rgba(${ring},${a * 0.75})`;
          ctx.fillRect(p.x - p.s * 4, p.y - 0.5, p.s * 8, 1);
          ctx.fillRect(p.x - 0.5, p.y - p.s * 4, 1, p.s * 8);
        }
      }
      if (!still) raf = requestAnimationFrame(frame);
    };
    size();
    addEventListener("resize", size);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
    };
  }, [key, outline]);

  return (
    <div className="bio-fx bio-glitter" aria-hidden="true">
      <canvas ref={ref} />
      {PETALS.map((p, i) => (
        <i
          key={i}
          className="bio-petal"
          style={
            {
              left: p.left,
              "--d": p.d,
              "--dx": p.dx,
              "--s": p.s,
              animationDelay: p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
