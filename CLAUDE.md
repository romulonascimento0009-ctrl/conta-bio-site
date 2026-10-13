@AGENTS.md

# PlataformaSites

Plataforma de **Bio Sites** (mini site estilo "link na bio", celular primeiro) para empresas de qualquer segmento. O operador cria, edita, aprova e publica; empresas convidadas editam só o próprio Bio Site. Endereço: `dominio.com/empresa`.

## Estado

Fases 0, 1, 2 e 2B (Bio Sites) concluídas em 2026-10-13. Cada nova fase exige aprovação explícita do usuário. Onde paramos e próximo passo: `docs/STATE.md`. Visual aprovado pelo usuário: `prototipos/bio-site-mescla.html`.

## Documentação (ler só o necessário para a tarefa)

- `docs/STATE.md` — onde paramos, pendências, próximo passo. Ler sempre ao retomar.
- `docs/PROJECT.md` — visão, escopo e requisitos.
- `docs/ARCHITECTURE.md` — arquitetura e modelo de dados.
- `docs/DECISIONS.md` — decisões tomadas e pendentes, com alternativas.
- `docs/ROADMAP.md` — fases e critérios de conclusão.
- `docs/TESTING.md` — estratégia e ambiente de testes.
- `docs/DESIGN.md` — direção visual dos sites e do painel, temas, regras de fontes.
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
- `npm run seed:demo` — (re)cria 3 Bio Sites publicados → http://localhost:3000/demo-padaria, `/demo-salao`, `/demo-clinica`
- Lighthouse (celular): ver `docs/TESTING.md`; meta ≥ 90 em todas as categorias
- `npx tsx scripts/screenshots.mts <url> <pasta>` — capturas em celular/tablet/desktop para revisão visual
- `npx tsx scripts/font-specimen.mts <url> <png>` — conferir acentos de todas as fontes (obrigatório ao adicionar fonte)
- Build e scripts exigem `.env.local` (ver `.env.example`). Nunca apagar `.data/pglite` (contém a conta do operador); só `.data/e2e` é descartável.

## Regras de desenvolvimento

- Bio Sites são dados: `BioDocument` (`src/sites/bio.ts`) validado por schema; nunca HTML livre gerado por IA.
- Dados de contato ficam em `contact` e os cartões (Instagram, Google, WhatsApp, mapa…) os leem via `resolveLink()` — não duplicar dados nos blocos.
- Alterações simples (texto, cor, imagem, link, ordem de blocos) são operações determinísticas (ex.: `applyQuickEdit`). IA só para briefing, textos, direção visual e mudanças complexas, e sempre devolve dados validados pelo mesmo schema.
- Toda mudança gera rascunho/versão; publicar exige aprovação explícita; versões antigas restauráveis.
- Isolamento por cliente em dados (`client_id` em toda tabela de conteúdo) e arquivos (`clientKey()`).
- Arquitetura proporcional ao MVP: monólito, sem microserviços ou abstrações especulativas.
- Interfaces responsivas e acessíveis (WCAG 2.2 AA). Ao desenhar telas do painel ou seções de site, usar a skill `frontend-design`.
- Para código que chama a API da Claude, carregar a skill `claude-api` antes.
- Tabelas de autenticação (`src/db/schema/auth.ts`) são geradas pela CLI do Better Auth; não editar à mão.
- Acesso ao banco só via `src/data/` (camada de acesso a dados). Documento de site só referencia imagens do próprio cliente.
- Mudança incompatível no schema do `BioDocument` (remover fonte, bloco, campo) invalida documentos salvos: exige migração de documentos e `schemaVersion` novo.
- Endereços públicos ficam na raiz (`/[slug]`): toda nova rota de primeiro nível do sistema precisa entrar em `RESERVED_SLUGS` (`src/clients/slug.ts`).
- Contraste AA é validado no schema (cartões, faixa, logo); novos temas/cores passam pelos testes de `bio.test.ts`.

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
