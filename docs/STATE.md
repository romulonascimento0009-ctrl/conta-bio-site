# Estado atual

Atualizado: 2026-10-21 · **Park Vision publicado no visual D41** (local). Próximo: Fase 6 (produção), aguardando aprovação e o domínio.

## Pronto e verificado

- **Bio Sites** em `dominio.com/empresa` (D19–D27), visual aprovado (`prototipos/bio-site-mescla.html`): topo, faixa opcional, cartões com ícones de marca, Wi-Fi com QR, horários, galeria, redes, WhatsApp flutuante. 5 temas × 5 segmentos, contraste AA no schema.
- **Painel do operador:** clientes, briefing, imagens, aba Bio Site, Editor visual, Edição rápida, Versões, **Acessos**, **Atividade**.
- **Editor visual e versões (Fase 3):** ver `ROADMAP.md`. Publicar exige ação explícita (D29); versões restauráveis (D30).
- **Acesso de clientes (Fase 4, D31–D35):** papéis operador/cliente em `memberships` (padrão negar); convite por link de uso único com validade de 1, 3 ou 7 dias (só o hash no banco; o link aparece uma vez); o aceite cria a conta e entra; área do cliente `/painel` com o mesmo editor, edição rápida, imagens e versões; **o cliente publica direto** (D31); auditoria das alterações; cancelar convite; remover acesso derruba a sessão. Isolamento conferido na camada de dados (`getClient` + `canAccessClient`).
- Verificação: `npm run check` ✔ (118 unitários) · `npm run build` ✔ · `npm run test:e2e` 45/45 ✔ (o E2E novo também adultera o `clientId` de uma Server Action e confere que nada é gravado em outro cliente). Lighthouse não refeito: as páginas públicas não mudaram.
- **Aparência (D36):** topo sem desenhos por padrão; seção Cores visível; cor própria por cartão; cor da faixa e do botão do WhatsApp; aba Topo com cores do fundo, escurecimento, desfoque, cor do texto e borda do logo. 124 unitários e 45 E2E ✔.
- **Métricas (D37):** aba Métricas (operador e `/painel`): visitas por dia e por origem (QR, NFC, Instagram, Google…), toques por cartão, links e QR para impressão/NFC. Sem cookies, sem IP guardado. 133 unitários e 47 E2E ✔. Migração `0003_metrics` aplicada no banco local.
- Migração `0002_access` aplicada no banco local; a conta do operador recebeu o papel `operator` (conferido).
- **Next 16.3.8 (2026-10-14):** `next` e `eslint-config-next` atualizados de 16.3.7 (correções de segurança; publicados em 30/09, regra D12). `npm run check` ✔ (133) · `npm run build` ✔ · `npm run test:e2e` 47/47 ✔. Alertas restantes do `npm audit` (`braces`/`micromatch` via eslint-config-next; `esbuild` antigo via drizzle-kit) são só de ferramentas locais: risco aceito, acompanhar correções.
- **Teste manual da Fase 4 pelo usuário (2026-10-14), correções:** criar o Bio Site travava quando uma categoria do cadastro passava de 24 letras (limite da etiqueta). Agora o cadastro recusa ao salvar (até 6 categorias, 24 letras cada) e a criação corta em vez de travar; cadastros antigos continuam legíveis. "Briefing" virou **"Cadastro do cliente"** nas telas (endereço `/briefing` e nomes no código mantidos); "Frase curta" virou **"Slogan"**. 138 unitários e 47 E2E ✔.
- **E2E sob carga:** os 4 fluxos longos (admin, convite, editor, métricas) levam 9–22 s no `next dev` e estouravam o limite de 30 s com a máquina ocupada; agora usam `test.slow()` (limite de 90 s). Se voltar a falhar, alternativa: rodar o E2E sobre `next build` + `next start`.
- **Ícones com vida e links colados (D38, parte 1, 2026-10-19):** ícones com brilho e cor própria em todos os Bio Sites; "Cor própria do ícone" por cartão, Wi-Fi, horários e galeria (contraste ≥ 3:1 validado); Instagram, TikTok, WhatsApp e links aceitam o link copiado. Subtítulo do Instagram: "Siga no Instagram". Commit `f99760a`.
- **Estilos de cartão, destaque e fachada (D38, parte 2, 2026-10-19):** Aparência → "Estilo dos cartões" (Cor do tema, Claros, Vidro escuro); por cartão: destaque com halo, etiqueta no canto, valor à direita; Topo → "Como mostrar a foto" (desfocada ou nítida no alto). Demos atualizadas (`npm run seed:demo`). 149 unitários e 47 E2E ✔ · build ✔ · Lighthouse celular padaria e salão: 93/100/100/100.
- **Futurista e correção (2026-10-19):** estilo Futurista (padrão dos novos), destaque Neon ou Cheio. Corrigido o aviso "A component is changing a controlled input to be uncontrolled" ao apagar um campo obrigatório no editor (E2E cobre). 149 unitários e 47 E2E ✔. Commitado.
- **Visual padrão único (2026-10-19):** todos os Bio Sites no visual Studio Lia Andrade (futurista + cartão principal em neon): novos já nascem assim; rascunhos existentes ajustados por `scripts/apply-standard-look.ts` (só o Park Vision mudou; **o publicado dele só muda quando publicar**). Demos recriadas no padrão. 151 unitários e 47 E2E ✔.
- **Futurista com vida (2026-10-19):** cartões no vidro da cor de cada ícone (ou preto, ou uma cor só) e fundo em movimento nas cores do topo (Cor 1–3), ambos padrão; a luz do destaque não cobre mais o cartão vizinho (visto no Park Vision). Seguidores do Instagram tirados das demos. 153 unitários e 47 E2E ✔. **Park Vision é o modelo oficial** para conferir toda alteração (`scripts/preview-screenshot.mts`).
- **Fase 5 — IA (D39, 2026-10-19), primeira entrega:** aba IA no editor (só operador): montar a partir do cadastro e pedidos em linguagem natural, com prévia, aplicar/descartar, alterações inválidas barradas com motivo, custo registrado e teto mensal (US$ 10). 161 unitários e 49 E2E ✔ · build ✔. Migração `0004_ai_usage` aplicada no banco local. **Falta a chave da API** (`ANTHROPIC_API_KEY` no `.env.local`) para o primeiro uso real — no Park Vision. Commitado em 2026-10-20 (`6aea378`).
- **Park Vision publicado no visual padrão (2026-10-20)**, autorizado pelo usuário; conferido em `/park-vision`. Categorias corrigidas no cadastro e no Bio Site (estavam separadas por ponto e com emojis, uma delas era cortada em 24 letras) e republicado. Visual padrão é grátis (não depende da IA): novos já nascem nele.

- **Visual padrão D41 (2026-10-20):** D40 descartado e revertido. Novo fluxo: **referência do usuário → protótipo → ajustes → sistema**. Protótipo aprovado ("perfeito demais"): `prototipos/bio-site-park-vision.html`. No sistema: três estilos de cartão padrão (Vidro neon — padrão; Cor do ícone; Escuro), todos iguais e sem halo; fundo da página por cliente (Topo → "Fundo da página"); cartão só com o nome; galeria em cartão com título e legenda por foto ("Meus trabalhos", "Feedback de clientes"); sem nota do Google e sem seguidores; fonte Fredoka. Rascunhos de todos os Bio Sites migrados; demos recriadas (padaria: cor do ícone; salão: vidro neon; clínica: escuro). **Park Vision (rascunho):** fundo arco-íris enviado como imagem do cliente, vidro neon, Fredoka no nome, "Meus trabalhos" com legendas **provisórias** (o usuário deve revisar), quadro "Sobre" com os dados do cadastro. Conferido lado a lado com o protótipo numa cópia temporária publicada (já apagada). **O publicado do Park Vision só muda quando publicar.** Faltam dados do usuário: **prints do Feedback** (criar galeria "Feedback de clientes" em cartão, só o nome) e **endereço** em Contato (o cartão "Como chegar" não aparece sem ele). Verificação: `npm run check` ✔ (165) · `npm run test:e2e` 51/51 ✔ · build ✔. Lighthouse não refeito. Commitado em `0454a15`.
- **Park Vision publicado (2026-10-21)** pelo usuário, no painel, após testar a prévia. Ajustes pedidos antes: link colado no subtítulo nunca aparece no cartão (vale o texto automático; aviso no editor); ícone de telefone do rodapé vira WhatsApp quando é o mesmo número (o número não aparece); mensagem do WhatsApp: "Oi, vim pelo Bio Site, gostaria de solicitar um orçamento." Conferido em `/park-vision`: destinos certos, sem link nem número escritos. 166 unitários ✔ · commit `c100b6f`. No texto "Sobre": "Norde e Nordeste" (provável "Norte e Nordeste") — confirmar com o usuário.

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0, Chromium do Playwright 1.63. Ausentes: Python, Docker.
- Banco local `.data/pglite` contém a conta do operador. **Não apagar.** PGlite: um processo por vez — não rodar scripts no banco com o `npm run dev` aberto.
- O Next só permite **um `next dev` por projeto**: parar o servidor de desenvolvimento antes de `npm run test:e2e`.
- Em outra cópia do projeto: `npm run db:migrate` antes de entrar (sem o papel, o operador fica sem acesso).

## Skills / plugins

- `frontend-design` instalada (projeto) e carregada nesta sessão.

## Pendências

- **Do usuário:** P6 (domínio), P7 (conta da API da Claude), P12 (nota do Google manual ou automática).
- Acessos: recuperação de senha do cliente (P13) e envio de convite por e-mail (P14). Hoje o operador copia o link e, se a senha for esquecida, remove o acesso e convida de novo.
- Técnicas antes do deploy: segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, cache do Bio Site publicado.
- **Pedidos do usuário no teste da Fase 4 (2026-10-14), a encaixar no roadmap:** (1) **vídeo curto** (~10 s) mostrando o trabalho do cliente; (2) **portfólio de serviços no botão de orçamento** (tocar → lista de serviços com foto/descrição/preço opcional → WhatsApp com mensagem pronta citando o serviço); (3) achou o Bio Site inicial **"robotizado, sem vida"** e trabalhoso: quer que, ao salvar o cadastro, a IA já monte algo próximo do ramo (ex.: Park Vision, manutenção de brinquedos) → é a Fase 5. O "sem vida" do visual eram as cores dos ícones (D38).
- Editor: arrastar e soltar para reordenar (hoje: botões ↑/↓); edição de texto alternativo das fotos direto na galeria (hoje: aba Imagens).

## Próximo passo

0. **Fase 6 (produção) aprovada em 2026-10-21, D42: Netlify + Neon grátis.** Passo 1: usuário cria as contas (sem cartão); passo 2: teste com as demos (Next 16, envio de fotos com sharp, painel); depois Blobs, backup diário, 2FA e CSP, migração do Park Vision. Ainda faltam do usuário: prints do Feedback e endereço do Park Vision. Para novos clientes: pedir a referência do fundo do ramo antes de montar.
1. Usuário coloca `ANTHROPIC_API_KEY` no `.env.local` e reinicia o servidor.
2. Primeiro uso real no **Park Vision** (modelo oficial): "Montar com IA", conferir a prévia, ajustar o prompt conforme o resultado; medir o custo real por montagem.
3. Depois: os pedidos pendentes do usuário (vídeo curto, portfólio de serviços no orçamento) e a Fase 6 (produção).
