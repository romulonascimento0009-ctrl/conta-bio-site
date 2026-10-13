# Arquitetura proposta (pendente de aprovação)

Status: **proposta**. Nada foi implementado. Escolhas tecnológicas marcadas como pendentes estão em `DECISIONS.md`.

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

**Registro de seções.** Cada tipo de seção = componente + schema de props + variantes + valores padrão. Novos segmentos adicionam seções e *presets* (combinações de seções e tema), não alteram o núcleo.

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
