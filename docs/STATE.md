# Estado atual

Atualizado: 2026-10-13 · Fase 0 concluída · **Implementação do produto não iniciada.**

## Ambiente encontrado
- Pasta `C:\Projetos\PlataformaSites` estava vazia; não é repositório Git.
- Windows 11 Pro, PowerShell 5.1. Node 24.21.0, npm/npx 11.19.0, VS Code 1.112, Claude Code 2.1.296, winget.
- Ausentes: Git, Python (só o atalho da Microsoft Store, 0 bytes), bash, Docker, pnpm/yarn/bun, CLIs de nuvem.
- Internet: disponível (npm registry respondeu 200).
- Config do usuário (`~/.claude/settings.json`): só tema. Nenhum plugin instalado antes; marketplace oficial `anthropics/claude-plugins-official` já cadastrado.

## Skills / plugins
**Já disponíveis na sessão (embutidas, reutilizáveis):** `code-review`, `security-review`, `simplify`, `claude-api`, `run`, `claude-in-chrome`, `init`, `update-config`, `fewer-permission-prompts`.

**Instalado e verificado:** `frontend-design@claude-plugins-official` (escopo projeto, `.claude/settings.json`). Verificado com `claude plugin list` (enabled) e `claude plugin details` (1 skill, sem hooks/MCP/scripts, ~80 tokens fixos). Uso real ainda não exercitado (não há UI).

**Avaliados e não instalados:**
| Recurso | Motivo |
|---|---|
| `security-guidance` (oficial) | Hooks exigem bash + Python + Git — ausentes. Reavaliar após instalar Git/Python. |
| `claude-security` (oficial) | Scripts Python; sem código para escanear. Reavaliar na Fase 2+. |
| `typescript-lsp` (oficial) | Exige `npm install -g typescript-language-server typescript` (instalação global). Útil na Fase 1. |
| `playwright` MCP (Microsoft) | Usa `@playwright/mcp@latest` (versão não fixada). Preferir `@playwright/test` no projeto; `claude-in-chrome` já cobre inspeção visual. |
| `context7` (Upstash) | Serviço externo hospedado com login; envia consultas a terceiros. Opcional, requer sua autorização. |
| `feature-dev`, `claude-md-management` (oficiais) | Redundantes com fluxo atual e skills embutidas; reavaliar se houver necessidade. |
| `webapp-testing` (anthropics/skills) | Exige Python + Playwright para Python. |

Fontes: catálogo local `~/.claude/plugins/marketplaces/claude-plugins-official`; https://github.com/anthropics/skills ; https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md

## Pendências que dependem do usuário
Decisões P1–P8 em `DECISIONS.md` (stack, banco, storage, hospedagem, autenticação, domínio, modelo de IA, instalar Git).

## Próximo passo
Após aprovação das decisões: instalar Git, (opcional) `typescript-lsp`, iniciar Fase 1 do `ROADMAP.md`.
