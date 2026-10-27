/**
 * Efeito "bolhas" do visual padrão (Casa Limpa; protótipo `prototipos/bio-site-casa-limpa.html`,
 * referência de fundo do usuário): bolhas grandes desfocadas paradas, bolhas de sabão subindo
 * devagar e brilhos de 4 pontas piscando, numa camada parada atrás do conteúdo. Só CSS
 * (deslocamento e transparência). Quem desligou as animações vê só as bolhas grandes e os
 * brilhos parados.
 */

/** [esquerda %, topo %, diâmetro px] */
const BOKEH = [
  [72, 4, 120],
  [84, 30, 70],
  [-6, 52, 90],
  [62, 74, 56],
] as const;
/** [esquerda %, diâmetro px, duração s, atraso s] */
const BUBBLES = [
  [8, 22, 16, 0],
  [22, 14, 22, -6],
  [41, 30, 19, -11],
  [63, 18, 24, -3],
  [79, 26, 17, -8],
  [91, 12, 21, -14],
] as const;
/** [esquerda %, topo %, tamanho px, duração s, atraso s] */
const SPARKS = [
  [10, 8, 18, 3.6, 0],
  [86, 6, 22, 4.4, -1.2],
  [92, 30, 14, 3.2, -2],
  [6, 44, 14, 5, -0.6],
  [88, 58, 18, 4, -2.8],
  [12, 74, 20, 4.6, -1.8],
  [80, 86, 14, 3.8, -0.4],
] as const;

export function BubblesFx() {
  return (
    <div className="bio-fx bio-bubbles" aria-hidden="true">
      {BOKEH.map(([x, y, d], i) => (
        <span
          key={`k${i}`}
          className="bio-bokeh"
          style={{ left: `${x}%`, top: `${y}%`, width: d, height: d }}
        />
      ))}
      {BUBBLES.map(([x, d, t, w], i) => (
        <span
          key={`b${i}`}
          className="bio-bubble"
          style={
            {
              left: `${x}%`,
              width: d,
              height: d,
              "--d": `${t}s`,
              "--w": `${w}s`,
              "--x": `${x > 50 ? -16 : 16}px`,
            } as React.CSSProperties
          }
        />
      ))}
      {SPARKS.map(([x, y, s, t, w], i) => (
        <svg
          key={`s${i}`}
          className="bio-spark"
          viewBox="-10 -10 20 20"
          style={
            {
              left: `${x}%`,
              top: `${y}%`,
              width: s,
              height: s,
              "--d": `${t}s`,
              "--w": `${w}s`,
            } as React.CSSProperties
          }
        >
          <path d="M0-10C1-3 3-1 10 0C3 1 1 3 0 10C-1 3-3 1-10 0C-3-1-1-3 0-10Z" />
        </svg>
      ))}
    </div>
  );
}
