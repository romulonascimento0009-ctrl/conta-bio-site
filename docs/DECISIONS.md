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

## Pendentes

**P5b — Segundo fator (TOTP ou passkey).** Obrigatório antes do deploy (Fase 5). Plugins `twoFactor`/`passkey` do Better Auth.

**P6 — Domínio principal** para os subdomínios dos clientes. Necessário antes da publicação (Fase 5); para testes locais, Fase 2 usará `*.localhost`.

**P7 — Modelo de IA.** Recomendação: API da Claude com Sonnet 5.5 (`claude-sonnet-5-5`) para geração; avaliar Haiku 5.5 para textos curtos. Confirmar preços carregando a skill `claude-api` na Fase 4. Requer conta e chave de API.

**P9 — Content-Security-Policy.** Cabeçalhos básicos já ativos (nosniff, referrer, frame SAMEORIGIN, permissions). CSP com nonce fica para quando o editor (iframe) e os sites públicos existirem, para definir as regras uma vez só.
