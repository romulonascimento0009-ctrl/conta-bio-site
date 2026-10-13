# Estado atual

Atualizado: 2026-10-13 · **Fase 1 (fundação) concluída** · Fase 2 aguarda aprovação.

## Pronto e verificado

- Git 2.55.0 instalado; repositório `main` com identidade local.
- Projeto Next.js 16.3.7 na raiz; dependências com versões exatas.
- Banco: Drizzle + PGlite local (`.data/pglite`), migração `drizzle/0000_auth.sql` aplicada (idempotente).
- Login do operador (Better Auth), `/admin` protegido, sair, cadastro público bloqueado, rate limit de login comprovado (6ª tentativa → 429).
- Armazenamento local com isolamento por cliente e proteção contra path traversal (testado).
- Cabeçalhos de segurança conferidos no servidor de produção (`next start`).
- `npm run check` ✔ · `npm run build` ✔ · `npm run test:e2e` 14/14 ✔ (desktop e celular, incluindo axe na tela de login).

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0 (inclui bash em `C:\Program Files\Git\bin`), Chromium do Playwright 1.63.
- Ausentes: Python, Docker. Sessões de terminal já abertas antes da instalação do Git precisam ser reabertas para enxergá-lo no PATH.

## Skills / plugins

- Instalado e verificado: `frontend-design` (escopo projeto). Ainda não usado — telas atuais são provisórias.
- Embutidas reutilizáveis: `code-review`, `security-review`, `simplify`, `claude-api`, `run`, `claude-in-chrome`.
- Não instalados: `security-guidance`/`claude-security` (ainda exigem Python), `typescript-lsp` (instalação global, opcional), Playwright MCP (versão não fixada), `context7` (serviço externo). Avaliação completa no histórico do Git deste arquivo (commit da Fase 0).

## Pendências

- **Do usuário:** criar o próprio operador local com `npm run admin:create`; P6 (domínio) e P7 (conta da API da Claude) antes das Fases 4–5.
- Técnicas: segundo fator (P5b), CSP (P9), driver R2 — todas antes do deploy.
- `eslint@9` está marcado como “sem suporte” pelo npm; manter até o `eslint-config-next` suportar ESLint 10.

## Próximo passo

Fase 2 — núcleo de sites (`ROADMAP.md`): schema `SiteDocument`, registro de seções para beleza, tema por tokens, renderizador por subdomínio (`*.localhost`), clientes, briefing e upload. Começa com o plano de design via `frontend-design`.
