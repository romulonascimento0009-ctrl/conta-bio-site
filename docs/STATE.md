# Estado atual

Atualizado: 2026-10-13 · **Fases 1 e 2 concluídas** · Fase 3 aguarda aprovação.

## Pronto e verificado

**Fase 1 — fundação:** Next.js 16, Drizzle + PGlite local, login do operador (Better Auth, cadastro público bloqueado, rate limit comprovado), armazenamento local isolado por cliente, cabeçalhos de segurança.

**Fase 2 — núcleo de sites:**

- `SiteDocument` validado (Zod): 7 tipos de seção (abertura, sobre, serviços/preços, galeria, depoimentos, contato/horários, chamada), contraste WCAG AA checado no schema, links seguros (sem `javascript:`).
- 3 temas (Ateliê, Rosa Forte, Verde Calmo) e 8 fontes auto-hospedadas; renderizador sem JS no cliente; barra "Agendar" fixa no celular.
- Sites públicos em `<slug>.localhost:3000` (só versão publicada); `/s/*` bloqueado no domínio do painel.
- Painel: clientes (criar/editar/excluir com confirmação), briefing, imagens (envio com redução no navegador, validação real, WebP sem EXIF, descrição, exclusão protegida), criação do site por tema, edição do rascunho em JSON validado, prévia.
- Demo: `npm run seed:demo` → http://demo.localhost:3000.
- Verificação: `npm run check` ✔ (80 unitários) · `npm run build` ✔ · `npm run test:e2e` 33/33 ✔ · Lighthouse celular 93/100/100/100 · capturas dos 3 temas revisadas.

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0, Chromium do Playwright 1.63. Ausentes: Python, Docker.
- Banco local `.data/pglite` contém a conta do operador. **Não apagar.**

## Skills / plugins

- `frontend-design` instalada (projeto), mas **não carrega na sessão em que foi instalada**: nesta sessão as orientações foram seguidas lendo o `SKILL.md` diretamente. Em sessões novas deve aparecer na lista de skills — confirmar.
- Avaliação dos plugins não instalados: ver histórico do Git deste arquivo (Fase 0).

## Incidentes desta sessão

- Apaguei `.data/pglite` por engano durante a Fase 2 e recriei a conta do operador com as mesmas credenciais (registrado na memória do assistente para não repetir).
- Cormorant Garamond removida por defeito de acentuação (D16).

## Pendências

- **Do usuário:** P6 (domínio) e P7 (conta da API da Claude) antes das Fases 4–5. Conferir o painel e o demo no navegador.
- Técnicas: segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, cache do site publicado — antes do deploy.
- `eslint@9` marcado como sem suporte; manter até o `eslint-config-next` suportar ESLint 10.

## Próximo passo

Fase 3 — editor visual e versões (`ROADMAP.md`): prévia com seleção por clique, painel de propriedades gerado do schema, operações determinísticas com desfazer/refazer, versões, restauração, aprovação e publicação pelo painel (com invalidação de cache).
