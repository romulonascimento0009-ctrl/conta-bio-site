# Decisões

Formato: decisão · motivo · alternativas. Pendentes exigem aprovação do usuário.

## Tomadas

**D1 — Site como dados (JSON + schema), não HTML gerado.** Permite editor determinístico, validação, versionamento barato, IA segura e evolução para outros segmentos. Alternativa rejeitada: IA gerando HTML/CSS por cliente (difícil de editar, validar e manter).

**D2 — Monólito único.** Um operador e volume pequeno não justificam serviços separados. Alternativa: painel e sites públicos em apps separados — reavaliar só se houver necessidade comprovada.

**D3 — IA restrita a tarefas que exigem interpretação.** Custo e previsibilidade. Operações simples são determinísticas.

**D4 — Snapshots completos por versão.** Documentos pequenos (KB); mais simples que diffs. Reavaliar se o volume crescer.

**D5 — Skills: só `frontend-design` instalada (escopo projeto).** Ver avaliação completa em `STATE.md`.

## Pendentes (precisam de aprovação)

**P1 — Stack da aplicação.** Recomendação: **Next.js (App Router) + TypeScript + Tailwind CSS + Zod**, um único app para painel, editor e sites públicos (roteamento por host). Motivos: Node já instalado; renderização no servidor e cache para os sites públicos; ecossistema maduro. Alternativas: SvelteKit (mais leve, ecossistema menor); Astro para sites + app SPA separado para o painel (dois projetos — mais complexidade).

**P2 — Banco de dados.** Recomendação: **PostgreSQL gerenciado** (ex.: Neon ou Supabase) com Drizzle ORM e migrações versionadas. Alternativa: SQLite (Turso/arquivo) — mais simples, mas backup e hospedagem serverless menos diretos.

**P3 — Armazenamento de imagens.** Recomendação: **Cloudflare R2** (compatível com S3, sem custo de saída). Alternativas: S3, Supabase Storage, Vercel Blob.

**P4 — Hospedagem.** Opções:
- (a) Vercel — menos operação, subdomínios curinga e domínios personalizados por API; custo pode variar com uso.
- (b) VPS (ex.: Hetzner) + Caddy (TLS sob demanda para domínios de clientes) — custo fixo e previsível, porém você mantém servidor, atualizações e backups.
Recomendação inicial: (a) para o MVP, com limites de gasto configurados; migrar para (b) se custos ficarem imprevisíveis.

**P5 — Autenticação do operador.** Recomendação: Auth.js ou Better Auth com passkey ou senha + TOTP. Alternativa mínima: proteção na borda (ex.: Cloudflare Access).

**P6 — Domínio principal** para os subdomínios dos clientes. Necessário antes da publicação.

**P7 — Modelo de IA.** Recomendação: API da Claude com Sonnet 5.5 (`claude-sonnet-5-5`) para geração; avaliar Haiku 5.5 para textos curtos. Confirmar preços e limites carregando a skill `claude-api` quando for implementar. Requer conta e chave de API.

**P8 — Instalar Git.** Fortemente recomendado antes do primeiro código (histórico, desfazer, e requisito de plugins de segurança). Comando: `winget install --id Git.Git -e`.
