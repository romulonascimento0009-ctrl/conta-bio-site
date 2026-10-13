@AGENTS.md

# PlataformaSites

Plataforma interna (um único operador) para criar, editar, aprovar e publicar sites de apresentação para clientes. Primeiro segmento: profissionais da beleza. Deve aceitar novos segmentos sem reconstrução.

## Estado

Fase 1 (fundação) concluída em 2026-10-13. Cada nova fase exige aprovação explícita do usuário. Onde paramos e próximo passo: `docs/STATE.md`.

## Documentação (ler só o necessário para a tarefa)

- `docs/STATE.md` — onde paramos, pendências, próximo passo. Ler sempre ao retomar.
- `docs/PROJECT.md` — visão, escopo e requisitos.
- `docs/ARCHITECTURE.md` — arquitetura e modelo de dados.
- `docs/DECISIONS.md` — decisões tomadas e pendentes, com alternativas.
- `docs/ROADMAP.md` — fases e critérios de conclusão.
- `docs/TESTING.md` — estratégia e ambiente de testes.
- Next.js 16 mudou APIs: consultar `node_modules/next/dist/docs/` antes de usar uma API do Next (ex.: `middleware` agora é `src/proxy.ts`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 estrito · Tailwind 4 · Zod 4 · Drizzle ORM · PostgreSQL (PGlite local quando `DATABASE_URL` vazio) · Better Auth · Vitest · Playwright + axe. Versões fixadas exatas em `package.json`.

## Comandos (verificados no Windows/PowerShell)

- `npm run dev` / `npm run build` / `npm start`
- `npm run check` — lint + typecheck + formatação + unitários (rodar antes de commitar)
- `npm test` — unitários (Vitest, `src/**/*.test.ts`)
- `npm run test:e2e` — E2E (Playwright, porta 3100, banco isolado em `.data/e2e`, recriado a cada execução)
- `npm run format` — Prettier
- `npm run db:generate` — gera migração após alterar `src/db/schema/*` (usar `-- --name <nome>`)
- `npm run db:migrate` — aplica migrações
- `npm run admin:create` — cria o operador ou redefine a senha
- Build e scripts exigem `.env.local` (ver `.env.example`).

## Regras de desenvolvimento

- Sites são dados: configuração estruturada e validada por schema; nunca HTML livre gerado por IA.
- Alterações simples (texto, cor, imagem, link, ordem de seções) são operações determinísticas. IA só para briefing, textos, direção visual e mudanças complexas, e sempre devolve dados validados pelo mesmo schema.
- Toda mudança gera rascunho/versão; publicar exige aprovação explícita; versões antigas restauráveis.
- Isolamento por cliente em dados (`client_id` em toda tabela de conteúdo) e arquivos (`clientKey()`).
- Arquitetura proporcional ao MVP: monólito, sem microserviços ou abstrações especulativas.
- Interfaces responsivas e acessíveis (WCAG 2.2 AA). Ao desenhar telas do painel ou seções de site, usar a skill `frontend-design`.
- Para código que chama a API da Claude, carregar a skill `claude-api` antes.
- Tabelas de autenticação (`src/db/schema/auth.ts`) são geradas pela CLI do Better Auth; não editar à mão.

## Segurança

- Toda página, Route Handler e Server Action administrativa chama `requireSession()`. O `proxy.ts` é só redirecionamento otimista.
- Segredos apenas em variáveis de ambiente (`.env.local` fora do Git); nunca em código, logs ou docs. Ambiente validado em `src/lib/env.ts`.
- Validar toda entrada no servidor com Zod; uploads: checar tipo real, tamanho, reprocessar imagens.
- Não instalar dependências, plugins ou MCPs sem avaliar origem e sem autorização. Fixar versões exatas. Scripts de instalação do npm ficam bloqueados salvo necessidade comprovada.
- Não executar ações destrutivas (apagar, sobrescrever, publicar) sem confirmação.

## Contexto enxuto

- Não repetir investigações registradas em `docs/STATE.md` / `docs/DECISIONS.md`.
- Atualizar `docs/STATE.md` ao fim de cada sessão de trabalho relevante.
- Manter este arquivo curto; detalhes vão para `docs/`.
