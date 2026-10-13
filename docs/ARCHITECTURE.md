# Arquitetura

Status: **aprovada em 2026-10-13**. Implementado: Fases 1 e 2 (autenticação, banco, armazenamento, schema do site, seções, temas, renderizador, subdomínios, clientes, briefing, imagens). Ainda por fazer: editor visual, versões/publicação pelo painel (Fase 3), IA (Fase 4). Escolhas e pendências em `DECISIONS.md`.

## Mapa do código

- `src/lib/env.ts` — variáveis de ambiente validadas (Zod), lidas sob demanda.
- `src/db/` — conexão Drizzle (Postgres via `DATABASE_URL`, senão PGlite em `PGLITE_DIR`) e schema (`auth.ts` gerado; `app.ts`: clients, briefings, sites, site_versions, assets). Migrações SQL em `drizzle/`.
- `src/lib/auth.ts`, `src/lib/session.ts` — Better Auth e `requireSession()`.
- `src/proxy.ts` + `src/lib/hosts.ts` — `<slug>.<ROOT_DOMAIN>` reescrito para `/s/<slug>`; `/s/*` bloqueado no domínio do painel; redirecionamento otimista de `/admin` e `/preview`.
- `src/sites/` — núcleo puro (sem banco/Next): `document.ts` (schema `SiteDocument`, validação, contraste), `sections.ts` (tipos de seção e variantes), `presets.ts` (temas e documento inicial), `fonts.ts`, `links.ts` (links seguros), `color.ts`.
- `src/sites/render/` — `SiteRenderer` e seções (componentes de servidor, sem JS no cliente), `fonts.ts` (next/font).
- `src/clients/` — slug, briefing, situações.
- `src/media/process.ts` — validação e variantes WebP com sharp (remove EXIF).
- `src/data/` — **camada de acesso a dados**: única porta para o banco. Funções administrativas chamam `requireSession()`; funções públicas: `getPublishedSiteBySlug`, `findAssetVariant`.
- `src/lib/storage/` — interface `Storage` + driver local; `clientKey()` isola por cliente.
- `src/app/admin/clientes/...` — painel (Server Actions em `actions.ts`); `src/app/preview/[clientId]` — prévia do rascunho; `src/app/s/[slug]` — site público; `src/app/media/[assetId]/[file]` — imagens.
- `scripts/` — migração, operador, demo (`seed-demo.ts`), preparo do E2E, capturas (`screenshots.mts`), amostra de fontes (`font-specimen.mts`).

## Princípio central

O site é um **documento JSON versionado e validado por schema** (`SiteDocument`). Editor, IA e renderizador usam o mesmo schema. Nenhuma camada gera HTML livre.

```
SiteDocument
├─ schemaVersion
├─ meta        (título, descrição, idioma, Open Graph)
├─ theme       (tokens: cores, fontes, raio, espaçamento → variáveis CSS)
├─ contact     (WhatsApp, telefone, endereço, link de agendamento, redes)
└─ sections[]  { id, type, variant, hidden, props }   ← props validadas pelo schema do tipo
```

## Visão geral (monólito único)

```
 Operador (navegador)
        │
        ▼
 App web (TypeScript) ─────────────────────────────┐
 ├─ /admin        painel: clientes, briefing,      │
 │                uploads, editor, versões         │
 ├─ API interna   ações validadas (schema)         │
 ├─ Renderizador  SiteDocument → página            │ Mesma base de componentes
 │                (prévia no editor + público)     │ de seção
 └─ Roteamento por host: <cliente>.dominio → site publicado
        │                │                 │
        ▼                ▼                 ▼
   Banco relacional   Armazenamento     API da Claude
   (dados, versões)   de objetos        (somente servidor)
                      (imagens por
                       cliente)
```

## Componentes

**Registro de seções.** Cada tipo de seção = componente + schema de props + variantes + valores padrão. Novos segmentos adicionam seções e _presets_ (combinações de seções e tema), não alteram o núcleo.

**Tema.** Tokens convertidos em variáveis CSS; componentes nunca usam cores/fontes fixas. Fontes de um conjunto curado e auto-hospedado (desempenho e privacidade). Validar contraste das combinações de cor (WCAG AA) no momento da edição.

**Editor visual.** Prévia em `iframe` renderizando o mesmo componente público. Elementos editáveis marcados com `data-section-id` e caminho do campo; clique envia mensagem ao painel, que mostra um formulário gerado a partir do schema. Edições são **operações determinísticas** (set campo, mover/adicionar/remover seção, trocar tema) aplicadas ao rascunho, com desfazer/refazer local.

**IA (servidor).** Usos: briefing → `SiteDocument` inicial; textos; direção visual (tema/preset); pedidos complexos em linguagem natural. A IA recebe o schema e devolve **operações ou documento estruturado**, que é validado; inválido = rejeitado/reparado, nunca aplicado às cegas. Mudança proposta aparece como prévia antes de aplicar. Registro de tokens/custo por chamada e cliente, com teto configurável. Mudanças simples nunca passam pela IA.

**Versionamento e publicação.**

- `sites` aponta para `draft` (editável) e `published_version_id`.
- Salvar cria `site_versions` imutável (snapshot JSON completo — simples e suficiente no MVP).
- Aprovação marca uma versão; publicar = mover o ponteiro para uma versão aprovada. Restaurar = copiar uma versão para o rascunho.
- Página pública lida do snapshot publicado, com cache invalidado na publicação.

**Dados (tabelas iniciais).** `clients`, `briefings`, `sites`, `site_versions`, `assets`, `ai_usage`, `audit_log`. Todas as linhas de conteúdo têm `client_id`; consultas sempre filtradas por ele.

**Arquivos.** Caminho `clients/<client_id>/...`; originais preservados e variantes otimizadas (WebP/AVIF, larguras responsivas) geradas no upload; verificação do tipo real, limite de tamanho, remoção de metadados EXIF (localização).

**Domínios.** MVP: DNS curinga `*.dominio` → app, que resolve o cliente pelo host. Futuro: domínios personalizados via tabela `domains` + emissão automática de TLS (depende da hospedagem escolhida).

**Autenticação.** Um operador. Login forte (senha longa + segundo fator, ou passkey), sessão segura, rotas `/admin` e API protegidas no servidor. Biblioteca consolidada, sem implementação caseira de criptografia.

## Qualidade

- Unitários: schemas, operações do editor, migração de `schemaVersion`, validação de saída da IA.
- E2E: fluxo cadastro → geração (IA simulada) → edição → aprovação → publicação.
- Acessibilidade automatizada (axe) e checagem visual em 3 larguras nos sites gerados.
- Detalhes em `TESTING.md` quando a stack for aprovada.

## O que deliberadamente não fazemos no MVP

Microserviços, filas dedicadas, multi-tenant com múltiplos usuários, CRDT/colaboração em tempo real, geração de sites estáticos separada por cliente, Kubernetes.
