# Design

Plano feito com as orientações da skill `frontend-design`. Duas superfícies com objetivos diferentes.

## 1. Sites dos clientes (beleza)

**Assunto e público.** Profissional autônoma ou pequeno estúdio (cabelo, unhas, sobrancelha, estética, maquiagem, barbearia). O visitante chega pelo Instagram ou WhatsApp, no celular, e quer em poucos segundos: ver o trabalho, saber o que é oferecido e quanto custa, e marcar horário. **A função principal do site é levar ao agendamento.**

**Ideia central.** O trabalho da profissional é visual; as fotos são o conteúdo. O layout é uma moldura editorial discreta para as fotos e para uma lista de serviços legível como um cardápio de salão. A ação "Agendar" fica sempre ao alcance do polegar no celular (barra fixa inferior).

**Revisão contra o padrão genérico.** Evitar: hero com número grande + gradiente; cartões idênticos com sombra cinza para cada serviço; rótulos em CAIXA ALTA espaçada acima de cada título; fundo creme com destaque terracota como padrão de todos os temas; animações de entrada em cada seção. Em vez disso:

- Serviços como **lista de preços tipográfica** (nome · linha pontilhada · preço), agrupada por categoria — o vernáculo real de salão, não cartões SaaS.
- Galeria em **grade de recorte variado** (uma foto grande + menores), não grade uniforme.
- Cada tema com personalidade própria, não variações de um mesmo bege.

**Tokens (por site, definidos no `SiteDocument.theme`).**

- Cores: `background`, `surface`, `text`, `muted`, `primary`, `onPrimary` (6 valores). Contraste texto/fundo e onPrimary/primary validados (WCAG AA) no schema.
- Tipografia: uma família de títulos + uma de texto, escolhidas de um conjunto curado (auto-hospedado via `next/font`). Escala modular 1.25; texto 1.0625rem; linhas ≤ 70 caracteres; serifas com entrelinha maior.
- Forma: `radius` (`none` | `soft` | `round`) aplicado com hierarquia (botões e fotos podem diferir).

**Temas iniciais (presets).**

| Tema        | Personalidade                            | Cores (fundo, superfície, texto, apagado, primária, sobre-primária)  | Tipos                                     |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Ateliê      | Estúdio de cabelo sofisticado, editorial | `#F7F5F2` `#ECE7E1` `#1E1B18` `#5E5750` `#4A2F3A` (ameixa) `#FFFFFF` | EB Garamond / Manrope                     |
| Rosa Forte  | Nail designer jovem, energético          | `#FFF7F9` `#FFE4EC` `#2A1020` `#6B4558` `#C2185B` `#FFFFFF`          | Bricolage Grotesque / Bricolage Grotesque |
| Verde Calmo | Estética e bem-estar, sereno             | `#F3F6F2` `#E2EAE0` `#18241C` `#4D5E52` `#2F5D46` `#FFFFFF`          | Fraunces / Work Sans                      |

**Fontes: verificação obrigatória.** Toda família nova passa por `npx tsx scripts/font-specimen.mts <url> <png>` (texto "você é ação pôr não Ângela"). Cormorant e Cormorant Garamond foram reprovadas em 2026-10-13: os acentos de ê/é/ô saem deslocados, tanto na versão variável quanto nas estáticas do Google Fonts.

**Layout (celular primeiro).**

```
[ nome / logo ............ Agendar ]   ← cabeçalho simples
[ foto principal em sangria        ]
[ título + frase + botão Agendar   ]   ← hero
[ Sobre: texto curto + retrato     ]
[ Serviços: Categoria              ]
[   Escova ............ R$ 60      ]
[   Corte ............. R$ 90      ]
[ Galeria: 1 grande + 4 pequenas   ]
[ Depoimentos: citação em destaque ]
[ Horários e endereço + mapa (link)]
[ Rodapé: redes sociais            ]
[ ======== Agendar (fixo) ======== ]   ← só no celular
```

Alinhamento à esquerda no texto corrido; hero centralizado só na variante `center`.

**Movimento.** Nenhuma animação automática. Apenas estados de foco/hover; `prefers-reduced-motion` respeitado.

**Desempenho.** Imagens em WebP com `srcset` (480/960/1600), `width/height` para evitar CLS, `fetchpriority=high` só no hero, demais `loading=lazy`. Sem JavaScript no cliente nos sites públicos.

## 2. Painel do operador

Ferramenta de trabalho de uma pessoa. Sóbrio, denso o suficiente, sem decoração. Fonte do sistema, neutros frios, um azul de ação (`#1D4ED8`), vermelho só para erro/destruição. Toda a personalidade visual fica nos sites dos clientes; o painel não compete com a prévia.
