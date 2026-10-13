# Roadmap

Cada fase só começa com aprovação do usuário. Critério de conclusão = verificado na prática, não apenas escrito.

## Fase 0 — Preparação ✅ (2026-10-13)

Ambiente investigado, skills avaliadas, documentação inicial. Concluído.

## Fase 1 — Fundação ✅ (2026-10-13)

Concluída: check (lint, tipos, formatação, 20 unitários), build de produção e 14 E2E (desktop + celular) passando.

- Git inicializado; projeto criado; TypeScript estrito; lint/format; Vitest e Playwright configurados.
- Banco + migrações; armazenamento de arquivos; variáveis de ambiente documentadas (`.env.example`).
- Login do operador e proteção de `/admin`.
- **Conclusão:** `dev`, `build`, `lint`, testes unitários e um E2E de login rodando com sucesso; comandos registrados no CLAUDE.md.

## Fase 2 — Núcleo de sites ✅ (2026-10-13)

Concluída: 80 unitários, 33 E2E (desktop + celular, axe sem violações no site e no painel), Lighthouse celular 93 / 100 / 100 / 100 (desempenho, acessibilidade, boas práticas, SEO) no demo, 3 temas revisados visualmente em 3 larguras.

- Schema `SiteDocument`, registro de seções (conjunto inicial para beleza), tema por tokens.
- Renderizador público com roteamento por subdomínio (testável localmente).
- CRUD de clientes, briefing, upload de imagens.
- **Conclusão:** site montado manualmente a partir de JSON renderiza corretamente em 3 larguras, passa axe sem violações graves e Lighthouse mobile ≥ 90.

## Fase 3 — Editor visual e versões

- Prévia com seleção por clique, painel de propriedades a partir do schema, operações determinísticas, desfazer/refazer.
- Versões, restauração, aprovação, publicação/despublicação.
- **Conclusão:** E2E cobre editar → salvar → restaurar → aprovar → publicar.

## Fase 4 — IA

- Briefing → documento inicial; textos; direção visual; pedidos em linguagem natural com prévia.
- Registro de custo e teto de gasto.
- **Conclusão:** saídas sempre validadas pelo schema; testes com IA simulada; custo médio por site medido e registrado.

## Fase 5 — Produção

- Segundo fator de login (P5b), CSP (P9), driver de armazenamento R2.
- Deploy, DNS curinga, backups testados (restauração real), monitoramento de erros.
- **Conclusão:** primeiro cliente real publicado.

## Futuro

Domínios personalizados; novos segmentos (novas seções/presets); acesso do cliente para aprovação.
