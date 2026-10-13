# Roadmap

Cada fase só começa com aprovação do usuário. Critério de conclusão = verificado na prática, não apenas escrito.

## Fase 0 — Preparação ✅ (2026-10-13)
Ambiente investigado, skills avaliadas, documentação inicial. Concluído.

## Fase 1 — Fundação
Pré-requisitos: P1–P5 e P8 decididos (`DECISIONS.md`).
- Git inicializado; projeto criado; TypeScript estrito; lint/format; Vitest e Playwright configurados.
- Banco + migrações; armazenamento de arquivos; variáveis de ambiente documentadas (`.env.example`).
- Login do operador e proteção de `/admin`.
- **Conclusão:** `dev`, `build`, `lint`, testes unitários e um E2E de login rodando com sucesso; comandos registrados no CLAUDE.md.

## Fase 2 — Núcleo de sites
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
- Deploy, DNS curinga, backups testados (restauração real), monitoramento de erros.
- **Conclusão:** primeiro cliente real publicado.

## Futuro
Domínios personalizados; novos segmentos (novas seções/presets); acesso do cliente para aprovação.
