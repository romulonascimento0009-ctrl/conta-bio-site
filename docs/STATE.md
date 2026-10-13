# Estado atual

Atualizado: 2026-10-13 · **Fase 3 (editor visual e versões) concluída** · Fase 4 aguarda aprovação.

## Pronto e verificado

- **Bio Sites** em `dominio.com/empresa` (D19–D27), visual aprovado (`prototipos/bio-site-mescla.html`): topo, faixa opcional, cartões com ícones de marca (Instagram → Google → … → localização por último), Wi-Fi com QR, horários, galeria, redes, WhatsApp flutuante. 5 temas × 5 segmentos, contraste AA no schema.
- **Painel:** clientes, briefing, imagens, aba Bio Site, **Editor visual**, Edição rápida, **Versões**.
- **Editor visual (Fase 3):** prévia de celular ao vivo; clicar num bloco/topo/faixa/redes na prévia abre a edição; lista de blocos com subir/descer, ocultar, remover (com confirmação) e adicionar (cartão, Wi-Fi, horários, galeria, texto); abas Topo (nome, frase, categorias, cidade, logo, foto de fundo, SEO), Contato, Faixa, Aparência (tema pronto, padrão, cantos, fontes, cores avançadas); desfazer/refazer (Ctrl+Z/Ctrl+Y), Ctrl+S, aviso ao sair sem salvar, validação ao vivo com atalho para o erro; no celular alterna Editar/Prévia.
- **Versões:** cada publicação vira versão; ver, restaurar no rascunho (guarda o rascunho antes, sem cópias repetidas) e republicar. Publicar exige aprovação explícita (D29).
- Verificação: `npm run check` ✔ (107 unitários) · `npm run build` ✔ · `npm run test:e2e` 43/43 ✔ · Lighthouse celular 92/100/100/100.

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0, Chromium do Playwright 1.63. Ausentes: Python, Docker.
- Banco local `.data/pglite` contém a conta do operador. **Não apagar.** PGlite: um processo por vez — não rodar scripts no banco com o `npm run dev` aberto.
- O Next só permite **um `next dev` por projeto**: parar o servidor de desenvolvimento antes de `npm run test:e2e`.

## Skills / plugins

- `frontend-design` instalada (projeto); não carregou na sessão em que foi instalada — conferir em sessão nova.

## Pendências

- **Do usuário:** P6 (domínio), P7 (conta da API da Claude), P11 (cliente publica direto ou com aprovação — decidir antes da Fase 4), P12 (nota do Google manual ou automática).
- Técnicas antes do deploy: segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, cache do Bio Site publicado.
- Editor: arrastar e soltar para reordenar (hoje: botões ↑/↓); edição de texto alternativo das fotos direto na galeria (hoje: aba Imagens).

## Próximo passo

Fase 4 — acesso de clientes por convite (`ROADMAP.md`): papéis operador/cliente, convite com validade e uso único, cliente edita só o próprio Bio Site com o mesmo editor, auditoria. Requer decidir P11.
