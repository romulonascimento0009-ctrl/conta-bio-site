# PlataformaSites

Plataforma interna (um único operador) para criar, editar, aprovar e publicar sites de apresentação para clientes. Primeiro segmento: profissionais da beleza. Deve aceitar novos segmentos sem reconstrução.

## Estado
Fase 0 (preparação) concluída. **Nenhum código do produto existe ainda.** Não iniciar implementação sem aprovação explícita do usuário. Estado atual e próximo passo: `docs/STATE.md`.

## Documentação (ler só o necessário para a tarefa)
- `docs/STATE.md` — onde paramos, pendências, próximo passo. Ler sempre ao retomar.
- `docs/PROJECT.md` — visão, escopo e requisitos.
- `docs/ARCHITECTURE.md` — arquitetura proposta (ainda não aprovada).
- `docs/DECISIONS.md` — decisões tomadas e pendentes, com alternativas.
- `docs/ROADMAP.md` — fases e critérios de conclusão.

## Ambiente confirmado (2026-10-13)
Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, VS Code. **Sem Git, sem Python real, sem Docker, sem bash.**
Comandos de build/teste: nenhum confirmado ainda (não há projeto). Registrar aqui somente após executá-los com sucesso.

## Regras de desenvolvimento
- Sites são dados: configuração estruturada e validada por schema; nunca HTML livre gerado por IA.
- Alterações simples (texto, cor, imagem, link, ordem de seções) são operações determinísticas. IA só para briefing, textos, direção visual e mudanças complexas, e sempre devolve dados validados pelo mesmo schema.
- Toda mudança gera rascunho/versão; publicar exige aprovação explícita; versões antigas restauráveis.
- Isolamento por cliente em dados e arquivos.
- Arquitetura proporcional ao MVP: monólito, sem microserviços ou abstrações especulativas.
- Interfaces responsivas e acessíveis (WCAG 2.2 AA como meta). Para UI, usar a skill `frontend-design`.
- Para código que chama a API da Claude, carregar a skill `claude-api` antes.

## Segurança
- Segredos apenas em variáveis de ambiente (`.env` fora do controle de versão); nunca em código, logs ou docs.
- Validar toda entrada no servidor; uploads: checar tipo real, tamanho, reprocessar imagens.
- Não instalar dependências, plugins ou MCPs sem avaliar origem e sem autorização do usuário.
- Não executar ações destrutivas (apagar, sobrescrever, publicar) sem confirmação.

## Contexto enxuto
- Não repetir investigações registradas em `docs/STATE.md` / `docs/DECISIONS.md`.
- Atualizar `docs/STATE.md` ao fim de cada sessão de trabalho relevante.
- Manter este arquivo curto; detalhes vão para `docs/`.
