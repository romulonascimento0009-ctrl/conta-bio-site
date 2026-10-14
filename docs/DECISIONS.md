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

**D23 — Formato `BioDocument` (schemaVersion 2).** Substitui o `SiteDocument` v1 (seções). Não houve conversor v1→v2: o banco só tinha o demo, recriado no formato novo. Estrutura: `profile` (topo), `contact` (dados centrais), `ticker` (faixa opcional), `blocks` (cartões `link` + painéis `wifi`/`hours`/`gallery`/`text`), `theme` (cores com contraste AA validado, fontes, cantos, padrão).

**D24 — Publicação básica já na 2B.** A edição rápida pedida pelo usuário precisa de "Salvar e publicar"; publicar = gravar versão imutável e apontar o endereço público. Histórico, comparação e restauração continuam na Fase 3.

**D25 — `experimental.inlineCss` ligado.** Elimina o CSS que bloqueava a renderização (Lighthouse celular 88 → 93 na padaria). Custo: HTML maior (~150 KB sem compressão, CSS duplicado no payload) e flag experimental. Reavaliar ao separar o CSS do painel do CSS dos Bio Sites (P10).

**D26 — QR code do Wi-Fi gerado no servidor** com `qrcode@1.5.4` (MIT, sem scripts de instalação), desenhado a partir da matriz de módulos — sem HTML externo.

**D27 — Endereço por caminho implementado.** Subdomínios e `proxy.ts` de reescrita removidos; `PUBLIC_URL` substitui `ROOT_DOMAIN`.

**D28 — Editor visual no mesmo documento (sem iframe).** A prévia usa o próprio `BioRenderer` em modo `embedded`, dentro de uma moldura com `transform` (os elementos "fixos" do Bio Site se prendem à moldura). Clique na prévia é capturado para selecionar o bloco (links e botões não disparam). Estado no navegador com histórico de desfazer/refazer (até 100 passos; digitação seguida no mesmo campo vira um passo). Validação ao vivo com o mesmo schema; o servidor valida de novo ao salvar.

**D29 — Aprovação explícita.** Publicar (aba Bio Site, editor) e republicar versão exigem marcar a caixa de aprovação; a nota da versão é opcional. "Salvar e publicar" da edição rápida conta como ação explícita.

**D30 — Versões.** Toda publicação cria uma versão imutável. Restaurar copia a versão para o rascunho e, antes, guarda o rascunho atual como versão — só se ele ainda não existir em nenhuma versão. Republicar só move o ponteiro público. Versões são isoladas por site (consulta sempre filtra pelo site do cliente).

**D31 — Cliente publica direto (P11, decidida pelo usuário em 2026-10-13).** O cliente convidado edita e publica o próprio Bio Site sem aprovação prévia do operador. Continua sendo ação explícita (a própria pessoa marca "Revisei a prévia e aprovo a publicação"); toda publicação vira versão e fica na auditoria; o operador pode restaurar ou republicar versões antigas a qualquer momento. Alternativa rejeitada: fila de aprovação do operador.

**D32 — Papéis em tabela própria (`memberships`).** `user_id` → `operator` (sem cliente) ou `client` + `client_id` (restrição CHECK). Sem linha = sem acesso (padrão negar). Não usamos `additionalFields` nem o plugin `admin` do Better Auth, para não editar as tabelas geradas pela CLI. A migração 0002 deu o papel de operador às contas existentes. Um usuário pertence a um cliente; um cliente pode ter várias pessoas.

**D33 — Convites.** Link `/convite/<token>` com 32 bytes aleatórios; o banco guarda só o SHA-256 (o link aparece uma vez para o operador copiar e enviar por WhatsApp ou e-mail — não há envio de e-mail no MVP). Validade de 1, 3 ou 7 dias. Uso único garantido por um `UPDATE … WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > now()`; se a criação da conta falhar, o convite é liberado e a conta parcial removida. O e-mail é fixado pelo operador; e-mail já usado por outra conta é recusado. Aceitar cria a conta (senha ≥ 12) e já entra. Remover acesso apaga a conta (as sessões caem em cascata); excluir o cliente apaga as contas dele.

**D34 — Isolamento na camada de dados.** `getClient()` só devolve o cliente se `canAccessClient()` permitir (operador: todos; cliente: só o próprio) e é a porta de todas as funções por cliente; as exclusivas do operador chamam `requireOperator()`. Argumentos ligados a Server Actions (`.bind(null, clientId)`) vêm do navegador e não são confiáveis — o E2E troca o `clientId` na requisição e confere que nada é gravado. Cliente que tenta outro cliente recebe 404 (não revela se existe). Editor, edição rápida, imagens e versões são as mesmas telas nas duas áreas (`view.tsx`).

**D35 — Auditoria (`audit_log`).** Registra quem (e-mail e papel copiados no momento) fez o quê: dados, briefing, criação do site, rascunho salvo (só se mudou, com as partes alteradas: Topo, Contato, Blocos…), publicação (com a nota), restauração e republicação de versão, imagens, convites e acessos. Visível ao operador na aba Atividade.

**D36 — Topo sem desenhos e cores livres (pedido do usuário, 2026-10-13).** Bio Sites novos nascem com padrão "Sem padrão" (só o fundo desfocado); os desenhos seguem disponíveis em Aparência. Os rascunhos locais existentes foram trocados para "Sem padrão" (versões publicadas não mudam até nova publicação). Cores: seção "Cores" sempre visível na aba Aparência (cartões, topo, página, faixa, botão do WhatsApp), com seletor e código hexadecimal; cada cartão pode ter degradê próprio (`colors` opcional no bloco); botão flutuante com cor própria (`floatingWhatsappColor`, ícone branco com contraste ≥ 3:1, WCAG 1.4.11). Topo personalizável (`theme.hero`, opcional): cor do texto, cor e intensidade do escurecimento, desfoque e borda do logo, editáveis na aba Topo junto com as cores do fundo e do monograma; sobrevive à troca de tema pronto. O texto do topo é validado (≥ 4,5:1) contra a média das cores do fundo sob o escurecimento; com foto de fundo não há como medir, e o editor orienta a ajustar o escurecimento. Campos opcionais: `schemaVersion` continua 2.

**D37 — Métricas no banco do sistema (2026-10-13).** O usuário citou o Turso (SQLite) e decidiu não usá-lo por agora; as métricas ficam no mesmo PostgreSQL (`site_events`, migração 0003). Visitas e cliques chegam por `navigator.sendBeacon` para `POST /api/m` (componente `Tracker`, só no endereço público — prévia e editor não contam). Origem: `?o=qr` / `?o=nfc` (links gerados na aba Métricas, com QR em PNG/SVG; o parâmetro some do endereço após a leitura) ou o domínio de quem trouxe a visita (Instagram, Google, Facebook, WhatsApp, TikTok, outros, direto). Cliques só são gravados se a chave existir no documento publicado (`trackTargets`). Privacidade (LGPD): sem cookies e sem IP guardado; visitante = HMAC diário (segredo + dia + IP + navegador), que muda todo dia e só serve para contar únicos por dia. Não contam: robôs/pré-visualizações (`isBot`), quem está logado, mais de 30 eventos/min do mesmo visitante. Tela Métricas para operador e cliente (7/30/90 dias): visitas, visitantes únicos, toques, visitas por dia (com tabela), origens e toques por cartão. Alternativa futura: agregados diários se o volume crescer.

## Pendentes

**P5b — Segundo fator (TOTP ou passkey).** Obrigatório antes do deploy (Fase 5). Plugins `twoFactor`/`passkey` do Better Auth.

**P6 — Domínio principal** da plataforma (Bio Sites em `dominio.com/empresa`). Necessário antes da produção.

**P12 — Nota do Google automática.** Exibir nota e número de avaliações exige a API do Google Places (chave, custo por consulta, regras de exibição) ou digitação manual. MVP: manual. Decidir antes da Fase 6 se vale automatizar (com cache diário).

**P13 — Recuperação de senha do cliente.** Hoje o operador remove o acesso e envia novo convite. Automatizar exige envio de e-mail (provedor e domínio verificado).

**P14 — Envio de convites por e-mail.** Hoje o operador copia o link. Mesmo requisito de P13.

**P7 — Modelo de IA.** Recomendação: API da Claude com Sonnet 5.5 (`claude-sonnet-5-5`) para geração; avaliar Haiku 5.5 para textos curtos. Confirmar preços carregando a skill `claude-api` na Fase 4. Requer conta e chave de API.

**P10 — Desempenho dos Bio Sites.** Lighthouse celular atual 92–93 (LCP ~3,1 s, local). Ganhos ainda possíveis: layout raiz separado para os Bio Sites (sem o CSS do painel), cache da página publicada invalidado na publicação, pré-carregar só a fonte usada pelo site, reduzir JS do Next nas páginas públicas (~50 KB não usados).

**P9 — Content-Security-Policy.** Cabeçalhos básicos já ativos (nosniff, referrer, frame SAMEORIGIN, permissions). CSP com nonce fica para quando o editor (iframe) e os sites públicos existirem, para definir as regras uma vez só.
