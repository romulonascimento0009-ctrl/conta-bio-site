# Arquitetura

Status: **aprovada em 2026-10-13**; produto redefinido para Bio Sites (D19). Implementado: Fases 1, 2 e 2B (autenticação, banco, armazenamento, Bio Site com blocos, temas, renderizador, endereço por caminho, clientes, briefing, imagens, edição rápida, publicação básica). Ainda por fazer: editor visual e versões (Fase 3), convites de clientes (Fase 4), IA (Fase 5). Escolhas e pendências em `DECISIONS.md`.

## Mapa do código

- `src/lib/env.ts` — variáveis de ambiente validadas (Zod), lidas sob demanda. `src/lib/public-url.ts` — `<PUBLIC_URL>/<slug>`.
- `src/db/` — conexão Drizzle (Postgres via `DATABASE_URL`, senão PGlite em `PGLITE_DIR`) e schema (`auth.ts` gerado; `app.ts`: clients, briefings, sites, site_versions, assets). Migrações SQL em `drizzle/`.
- `src/lib/auth.ts`, `src/lib/session.ts` — Better Auth e `requireSession()`. `src/proxy.ts` — redirecionamento otimista de `/admin` e `/preview`.
- `src/sites/` — núcleo puro (sem banco/Next): `bio.ts` (schema `BioDocument`, contraste, `resolveLink`, QR do Wi-Fi), `themes.ts`, `templates.ts` (Bio Site inicial por segmento a partir do briefing), `quick-edit.ts` (edição rápida determinística), `icons.ts`, `patterns.ts`, `fonts.ts`, `links.ts`, `color.ts`.
- `src/sites/render/` — `BioRenderer` (componente de servidor), `bio.css`, `Icon.tsx`, `client-buttons.tsx` (Compartilhar, Copiar senha — únicos trechos com JS no navegador), `fonts.ts`, `media.ts`.
- `src/clients/` — slug (com `RESERVED_SLUGS`), segmentos, briefing (campos reutilizados pela edição rápida), situações.
- `src/media/process.ts` — validação e variantes WebP com sharp (remove EXIF).
- `src/data/` — **camada de acesso a dados**: única porta para o banco. Funções administrativas chamam `requireSession()`; públicas: `getPublishedSiteBySlug`, `findAssetVariant`.
- `src/lib/storage/` — interface `Storage` + driver local; `clientKey()` isola por cliente.
- `src/app/admin/clientes/...` — painel (Dados, Briefing, Imagens, Bio Site, Edição rápida; Server Actions em `actions.ts`); `src/app/preview/[clientId]` — prévia do rascunho; `src/app/[slug]` — Bio Site público; `src/app/media/[assetId]/[file]` — imagens.
- `scripts/` — migração, operador, demos (`seed-demo.ts`), preparo do E2E, capturas (`screenshots.mts`), amostra de fontes (`font-specimen.mts`).
- `prototipos/` — protótipos visuais aprovados (referência de design, não são código do produto).

## Princípio central

O Bio Site é um **documento JSON versionado e validado por schema** (`BioDocument`). Edição rápida, editor visual (Fase 3), IA e renderizador usam o mesmo schema. Nenhuma camada gera HTML livre.

```
BioDocument (schemaVersion 2)
├─ meta         título e descrição (SEO)
├─ theme        cores (contraste AA validado), fontes, cantos, padrão ilustrado
├─ tickerTheme  cores padrão da faixa
├─ profile      logo, nome, frase, categorias, cidade, Compartilhar, foto de fundo
├─ contact      Instagram, WhatsApp, telefone, link e nota do Google, endereço, mapa, redes
├─ ticker       faixa de aviso opcional: ligada?, frases, cores próprias
├─ blocks[]     link (action: instagram | google_review | whatsapp | phone | maps | url)
│               wifi | hours | gallery | text   — na ordem exibida
└─ floatingWhatsapp
```

Cartões de serviço não guardam o link: `resolveLink(bloco, contact)` monta destino, ícone e subtítulo. Trocar o Instagram em `contact` atualiza o cartão e o rodapé de uma vez.

## Visão geral (monólito único)

```
 Operador (navegador)                 Visitante (celular)
        │                                    │
        ▼                                    ▼
 App web (Next.js) ─────────────────────────────────────────
 ├─ /admin/...      painel, edição rápida, publicação
 ├─ /preview/<id>   rascunho (exige sessão)
 ├─ /<slug>         Bio Site publicado (público)
 └─ /media/<id>/<largura>.webp   imagens (públicas, cache imutável)
        │                │                 │
        ▼                ▼                 ▼
   Banco relacional   Armazenamento     API da Claude (Fase 5)
   (dados, versões)   de objetos
```

## Componentes

**Blocos.** Cada tipo de bloco = schema + renderização. Novos segmentos ganham modelos (`templates.ts`) e, se preciso, novos tipos de bloco/ícones — sem alterar o núcleo.
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
