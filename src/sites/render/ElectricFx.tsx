import type { CSSProperties } from "react";

/**
 * Efeitos "elétrico" do visual padrão (D44, protótipo `prototipos/bio-site-rota316.html`):
 * camada parada atrás do conteúdo com clarão, bolinhas de luz, tubos e rastros de neon, luz
 * correndo nas bordas, engrenagens, raios e faíscas. Só transform/opacity; cores em
 * `--neon-a`/`--neon-b` (borda neon do cliente). Estilos em `bio.css` (.bio-fx).
 */

function gearPath(cx: number, cy: number, r: number, teeth: number, depth: number, hole: number) {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, rr] of [
      [0, r],
      [step * 0.12, r + depth],
      [step * 0.42, r + depth],
      [step * 0.54, r],
    ]) {
      pts.push(
        `${(cx + Math.cos(a + da) * rr).toFixed(1)},${(cy + Math.sin(a + da) * rr).toFixed(1)}`,
      );
    }
  }
  return `M${pts.join("L")}Z M${cx + hole},${cy}a${hole},${hole} 0 1,0 ${-2 * hole},0a${hole},${hole} 0 1,0 ${2 * hole},0Z`;
}

const GEAR = gearPath(100, 100, 70, 12, 16, 30);

const ORBS = [
  { left: "8%", top: "14%", size: "90px", c: "a", dx: "30px", dy: "40px" },
  { left: "78%", top: "40%", size: "120px", c: "a", dx: "-40px", dy: "30px" },
  { left: "18%", top: "62%", size: "70px", c: "b", dx: "40px", dy: "-30px" },
  { left: "70%", top: "86%", size: "100px", c: "b", dx: "-30px", dy: "-40px" },
  { left: "45%", top: "24%", size: "60px", c: "a", dx: "25px", dy: "35px" },
];
const STREAKS = [
  { y: "38%", c: "a", delay: "0s" },
  { y: "64%", c: "b", delay: "1.3s" },
  { y: "86%", c: "a", delay: "2.6s" },
  { y: "22%", c: "b", delay: "3.8s" },
  { y: "50%", c: "a", delay: "4.4s" },
];
const SPARKS = [
  [12, 0, "-30px"],
  [28, 1.4, "25px"],
  [47, 2.8, "-15px"],
  [63, 0.7, "35px"],
  [78, 3.6, "-25px"],
  [90, 2.1, "15px"],
  [36, 4.4, "20px"],
  [70, 5.2, "-20px"],
] as const;

const color = (c: string) => (c === "a" ? "var(--fx-a)" : "var(--fx-b)");

export function ElectricFx() {
  return (
    <div className="bio-fx" aria-hidden="true">
      <i className="bio-fx-flare" />
      {ORBS.map((o, i) => (
        <i
          key={`o${i}`}
          className="bio-fx-orb"
          style={
            {
              left: o.left,
              top: o.top,
              "--s": o.size,
              "--t": color(o.c),
              "--dx": o.dx,
              "--dy": o.dy,
              animationDelay: `-${i * 1.7}s`,
            } as CSSProperties
          }
        />
      ))}
      <i className="bio-fx-tube t1" />
      <i className="bio-fx-tube t2" />
      <i className="bio-fx-tube t3" />
      <i className="bio-fx-edge e1" />
      <i className="bio-fx-edge e2" />
      {STREAKS.map((s, i) => (
        <i
          key={`s${i}`}
          className="bio-fx-streak"
          style={{ "--y": s.y, "--t": color(s.c), animationDelay: s.delay } as CSSProperties}
        />
      ))}
      <svg className="bio-fx-gear g1" viewBox="0 0 200 200">
        <path d={GEAR} />
      </svg>
      <svg className="bio-fx-gear g2" viewBox="0 0 200 200">
        <path d={GEAR} />
      </svg>
      <svg className="bio-fx-bolt b1" viewBox="0 0 90 170">
        <path d="M70 0 L52 40 L66 44 L34 92 L50 96 L18 170" />
        <path d="M52 40 L30 58" />
      </svg>
      <svg className="bio-fx-bolt b2" viewBox="0 0 90 170">
        <path d="M60 0 L48 36 L64 42 L30 100 L46 104 L22 170" />
      </svg>
      <svg className="bio-fx-bolt b3" viewBox="0 0 90 170">
        <path d="M70 0 L50 46 L66 50 L28 120 L44 124 L26 170" />
        <path d="M50 46 L24 60" />
      </svg>
      {SPARKS.map(([left, delay, dx], i) => (
        <i
          key={`f${i}`}
          className="bio-fx-spark"
          style={{ left: `${left}%`, animationDelay: `${delay}s`, "--dx": dx } as CSSProperties}
        />
      ))}
    </div>
  );
}
