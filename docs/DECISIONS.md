# Decisões

Formato: decisão · motivo · alternativas.

## Tomadas

**D1 — Site como dados (JSON + schema), não HTML gerado.** Permite editor determinístico, validação, versionamento barato, IA segura e evolução para outros segmentos. Alternativa rejeitada: IA gerando HTML/CSS por cliente (difícil de editar, validar e manter).

**D2 — Monólito único.** Um operador e volume pequeno não justificam serviços separados.

**D3 — IA restrita a tarefas que exigem interpretação.** Custo e previsibilidade. Operações simples são determinísticas.

**D4 — Snapshots completos por versão.** Documentos pequenos (KB); mais simples que diffs. Reavaliar se o volume crescer.

**D5 — Skills: só `frontend-design` instalada (escopo projeto).** Ver `STATE.md`.

**D6 — Stack (P1, aprovada 2026-10-13):** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Zod 4. TypeScript 5.9 e ESLint 9 mantidos (versões do template oficial do Next 16.3.7) em vez de TS 7 / ESLint 10, por compatibilidade.

**D7 — Banco (P2, aprovada):** PostgreSQL + Drizzle ORM, migrações SQL versionadas em `drizzle/`. Em desenvolvimento e testes, **PGlite** (Postgres embutido em WASM) quando `DATABASE_URL` está vazio — dispensa Docker e conta externa. Produção: Postgres gerenciado (Neon sugerido). Limitação: PGlite aceita um processo por diretório (não rodar `db:migrate`/`admin:create` com o `dev` aberto no mesmo banco).

**D8 — Armazenamento (P3, aprovada):** interface `Storage` com driver local agora; driver R2 (S3) será adicionado quando houver conta Cloudflare.

**D9 — Hospedagem (P4, aprovada):** Vercel no MVP, com limite de gasto. O rate limit identifica o cliente por `x-forwarded-for`, confiável atrás da Vercel; se migrar para VPS, configurar o proxy reverso para sobrescrever esse cabeçalho.

**D10 — Autenticação (P5, aprovada):** Better Auth 1.7, e-mail + senha (mín. 12 caracteres, scrypt), cadastro público desativado, operador criado por script, rate limit em banco (5 tentativas/min em login, 100 req/min geral). Validação de sessão no servidor em cada página/ação; `proxy.ts` só faz redirecionamento otimista (orientação da documentação do Next 16 e do Better Auth).

**D11 — Git (P8):** instalado (2.55.0). Identidade configurada só neste repositório.

**D12 — Dependências:** versões exatas; nenhuma com menos de 14 dias de publicação na adoção. Scripts de instalação do npm (`esbuild`, `unrs-resolver`) não aprovados — ferramentas verificadas funcionando sem eles.

**D13 — Envio de imagens (Fase 2).** O navegador reduz a foto (lado maior ≤ 2400 px, JPEG 90%) e envia uma por requisição; o servidor aceita até 4 MB (`bodySizeLimit` 4,5 MB). Motivo: limite de 4,5 MB por requisição na Vercel e o `proxyClientMaxBodySize` do Next, que corta corpos grandes _sem erro_. O servidor confere o formato real (JPG/PNG/WebP/AVIF; SVG/GIF recusados), aplica a rotação EXIF e gera WebP 480/960/1600/2400 sem metadados. Alternativa futura: upload direto para R2 com URL assinada.

**D14 — Mídia pública por id aleatório.** `/media/<uuid>/<largura>.webp` não exige sessão (os sites publicados precisam dela); ids UUID v4 não são adivinháveis. Imagens de rascunho são, portanto, acessíveis a quem tiver o link. Cache `immutable` de 1 ano. Reavaliar se algum cliente exigir sigilo antes de publicar.

**D15 — Isolamento de imagens entre clientes.** Ao salvar o rascunho, toda imagem referenciada precisa pertencer ao mesmo cliente; na renderização, só imagens do cliente são carregadas. Imagem em uso (rascunho ou publicada) não pode ser excluída.

**D16 — Fontes.** Conjunto curado de 8 famílias auto-hospedadas via `next/font` (sem requisições ao Google no navegador). Cormorant e Cormorant Garamond foram removidas: os acentos de ê/é/ô saem deslocados (verificado com `scripts/font-specimen.mts`). O tema Ateliê usa EB Garamond.

**D17 — Editor JSON provisório.** Na Fase 2 o rascunho é editado como JSON validado (atende ao critério "site montado a partir de JSON"). Será substituído pelo editor visual na Fase 3. Publicação pelo painel também fica para a Fase 3; o demo é publicado por script.

**D18 — Hosts.** `<slug>.<ROOT_DOMAIN>` → site; o próprio domínio, `www.` e hosts desconhecidos → painel. Domínios personalizados (futuro) entrarão como consulta a uma tabela `domains` no mesmo ponto (`resolveHost`). **Substituída por D21.**

**D19 — Mudança de produto para Bio Sites (2026-10-13).** O usuário indicou a Nourbiosite como referência do que quer construir: mini site estilo "link na bio", qualquer segmento, criado pelo operador e editável pela própria empresa. Fases 1–2 viram base; o formato em seções é substituído por blocos (Fase 2B).

**D20 — Ferramenta ai-site-cloner não será usada.** Analisada sem instalar (MIT, Node ≥ 22, sem scripts de instalação, sem exec/eval no extrator; baixa todos os recursos do alvo sem limite de taxa visível). Motivos: os termos do próprio projeto restringem o uso a sites próprios ou com permissão e proíbem apresentar design alheio como seu; `nourbiosite.com.br/app` é área logada ("App do parceiro"); ela copia aparência, não o produto. Em vez disso: levantamento funcional a partir de telas fornecidas pelo usuário e design próprio.

**D21 — Endereço por caminho.** Bio Sites em `dominio.com/empresa` (padrão de link na bio; mais fácil de digitar na bio do Instagram; sem DNS curinga). Nomes reservados protegem rotas do painel. Substitui D18.

**D22 — Clientes por convite, depois do editor.** Empresas entram só por convite do operador (sem cadastro aberto no MVP), na fase seguinte ao editor visual, reutilizando o mesmo editor com permissões reduzidas.

## Pendentes

**P5b — Segundo fator (TOTP ou passkey).** Obrigatório antes do deploy (Fase 5). Plugins `twoFactor`/`passkey` do Better Auth.

**P6 — Domínio principal** da plataforma (Bio Sites em `dominio.com/empresa`). Necessário antes da produção.

**P12 — Nota do Google automática.** Exibir nota e número de avaliações exige a API do Google Places (chave, custo por consulta, regras de exibição) ou digitação manual. MVP: manual. Decidir antes da Fase 6 se vale automatizar (com cache diário).

**P11 — Publicação por clientes.** Na Fase 4: o cliente publica direto ou o operador aprova? Decidir antes da Fase 4.

**P7 — Modelo de IA.** Recomendação: API da Claude com Sonnet 5.5 (`claude-sonnet-5-5`) para geração; avaliar Haiku 5.5 para textos curtos. Confirmar preços carregando a skill `claude-api` na Fase 4. Requer conta e chave de API.

**P10 — Desempenho dos sites públicos.** Lighthouse celular atual 93 (LCP 3,0 s, local). Ganhos identificados: CSS próprio para os sites (hoje compartilhado com o painel e bloqueia a renderização, ~800 ms), cache da página publicada invalidado na publicação (Fase 3), reduzir JS do Next nas páginas públicas (~50 KB não usados).

**P9 — Content-Security-Policy.** Cabeçalhos básicos já ativos (nosniff, referrer, frame SAMEORIGIN, permissions). CSP com nonce fica para quando o editor (iframe) e os sites públicos existirem, para definir as regras uma vez só.
