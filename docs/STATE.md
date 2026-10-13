# Estado atual

Atualizado: 2026-10-13 · **Fase 2B (Bio Sites) concluída** · Fase 3 aguarda aprovação.

## Pronto e verificado

- Produto: plataforma de **Bio Sites** em `dominio.com/empresa` (D19–D27). Visual aprovado pelo usuário: `prototipos/bio-site-mescla.html` (mescla das referências Nourbiosite + Multlinks, design próprio).
- Bio Site: topo com logo, nome, frase, categorias, cidade e Compartilhar; foto de fundo desfocada com padrão ilustrado do segmento; faixa de aviso opcional (frases e cores editáveis); cartões com ícone e cor da marca (Instagram → Google logo abaixo → ações → … → localização por último); Wi-Fi (copiar senha + QR code); horários; galeria; redes; WhatsApp flutuante.
- 5 temas (Âmbar, Ameixa, Esmeralda, Oceano, Grafite) × 5 segmentos (alimentação, beleza, saúde, serviços, outro), contraste AA validado no schema.
- Painel: clientes com segmento, briefing novo, imagens, aba Bio Site (criar por tema, publicar, prévia, JSON avançado) e **Edição rápida** (Instagram, Google, WhatsApp, telefone, Wi-Fi, horários, faixa, localização → Salvar e publicar).
- Demos: `npm run seed:demo` → `/demo-padaria`, `/demo-salao`, `/demo-clinica`.
- Verificação: `npm run check` ✔ (95 unitários) · `npm run build` ✔ · `npm run test:e2e` 41/41 ✔ · Lighthouse celular 93/92/93 (desempenho) e 100 (acessibilidade, boas práticas, SEO).

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0, Chromium do Playwright 1.63. Ausentes: Python, Docker.
- Banco local `.data/pglite` contém a conta do operador. **Não apagar.** Não rodar scripts no banco com o `npm run dev` aberto (PGlite: um processo por vez).
- `.env.local` usa `PUBLIC_URL` (substituiu `ROOT_DOMAIN`).

## Skills / plugins

- `frontend-design` instalada (projeto); não carregou na sessão em que foi instalada — conferir em sessão nova.

## Pendências

- **Do usuário:** P6 (domínio), P7 (conta da API da Claude), P11 (cliente publica direto ou com aprovação), P12 (nota do Google manual ou automática).
- Técnicas antes do deploy: segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, cache do Bio Site publicado.
- `eslint@9` marcado como sem suporte; manter até o `eslint-config-next` suportar ESLint 10.

## Próximo passo

Fase 3 — editor visual e versões (`ROADMAP.md`): prévia de celular com clique no bloco, painel lateral, adicionar/reordenar/ocultar blocos, trocar tema/cores/ícones, desfazer/refazer, histórico de versões e restauração.
