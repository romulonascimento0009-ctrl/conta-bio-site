# Modelo piloto — do pedido ao Bio Site no ar

Procedimento validado com o **Park Vision** (2026-10-19 a 2026-10-21). Vale para todo cliente novo.
Decisões por trás: D41 (visual a partir de referências), D42 (produção grátis Netlify + Neon).

## Como a produção está montada

- **Um projeto só para todos os clientes:** `https://biositece.netlify.app/<slug>` (ex.: `/park-vision`).
  Cliente novo **não** cria projeto novo na Netlify nem banco novo no Neon.
- **Site:** Netlify Free (repositório `conta-bio-site` no GitHub, branch `main`; cada `git push` publica).
- **Banco:** Neon Free, região São Paulo. **Fotos:** Netlify Blobs (`STORAGE_DRIVER=netlify-blobs`).
- **Custo zero:** sem cartão em nenhum dos dois; no limite da cota o serviço pausa, não cobra.
- **Segredos:** só no `.env.neon` (fora do Git; modelo em `.env.neon.example`) e nas variáveis da Netlify.

## Parte A — Cliente novo (repetir a cada cliente)

1. **Cadastro do cliente** no painel: nome, ramo, cidade, slogan, até 6 categorias (24 letras cada,
   sem emojis nem pontos), WhatsApp, Instagram, link de avaliação do Google, **endereço** (sem ele o
   cartão "Como chegar" não aparece).
2. **Referência antes de criar:** pedir ao usuário as referências (fundo do ramo, exemplos que ele
   gosta). Nada de criar sem referência.
3. **Protótipo** em `prototipos/bio-site-<cliente>.html` (fundo em `prototipos/ref/`), ajustar até o
   usuário aprovar. Conferir no celular, lado a lado com a referência, antes de pedir aprovação.
4. **Levar para o sistema** (rascunho do cliente): fundo da página enviado como imagem do cliente,
   estilo de cartão padrão (vidro neon), fonte, galerias em cartão com legenda. Cores e detalhes do
   cliente ficam em Aparência → "Detalhes do visual padrão" (D43: borda neon, categorias, destaque
   do nome, slogan escuro, reflexo) e Topo → "Moldura do logo" (sem moldura para logo recortado).
   Logo com fundo preto: recortar só o preto ligado às bordas antes de enviar.
   **Código novo** (fonte, ícone, opção) só chega à produção com `git push`: enviar antes de copiar
   o cliente.
5. **Conferência do rascunho** (prévia no celular), itens que já deram problema:
   - Subtítulo dos cartões **sem link colado** (o sistema esconde, mas o certo é deixar vazio).
   - Mensagem do WhatsApp do cliente (ex.: "Oi, vim pelo Bio Site, gostaria de solicitar um
     orçamento."). Telefone igual ao WhatsApp vira ícone do WhatsApp (o número não aparece).
   - Tocar em **todos** os cartões e ícones: cada um abre o destino certo.
   - Textos do "Sobre" sem erro de digitação.
6. **Publicar** só com aprovação explícita do usuário ("pode publicar").
7. **Levar para a produção:**
   - Cliente montado **direto no painel da produção** (`/admin` em biositece): já está no ar ao publicar.
   - Cliente montado **no computador**: com o servidor local parado,
     `npx tsx --env-file=.env.neon scripts/copy-client-to-prod.ts <slug>`.
     Copia cadastro, Bio Site, versões, imagens, auditoria e métricas; recusa se o cliente já existir
     (nunca sobrescreve). **Depois da cópia, editar só na produção** — o banco local não é mais a fonte.
8. **Conferir no ar:** abrir `https://biositece.netlify.app/<slug>` no celular, fora do Wi-Fi de casa,
   tocar em todos os cartões. Gerar o QR/NFC só com o endereço final.

## Parte B — Montar a produção do zero (feito uma vez; refazer só se trocar de conta/serviço)

1. **Contas grátis, sem cartão:** Netlify e Neon (entrar com Google ou GitHub). Se pedir cartão, parar.
2. **Neon:** criar projeto (região São Paulo) → **Connect** → copiar o link `postgresql://...`.
3. **`.env.neon`:** copiar `.env.neon.example` para `.env.neon` **dentro da pasta do projeto** e
   preencher (abrir com `notepad "C:/Projetos/PlataformaSites/.env.neon"` — barras normais).
4. **GitHub:** enviar o código (`git push`). Recomendado deixar o repositório **privado**.
5. **Netlify:** Add new project → Import an existing project → GitHub → `conta-bio-site`.
   Trocar o nome em Configuração do projeto → **Alterar nome** (a Netlify sorteia um nome).
   Copiar o **ID do projeto** e criar um **token pessoal** (validade curta) para o `.env.neon`.
6. **Variáveis na Netlify:** `npx tsx scripts/netlify-env.ts --deploy` (envia as 5 variáveis, confere o
   tamanho de cada uma e dispara o deploy). Não cadastrar à mão nem pelo shell.
7. **Banco:** `npx tsx --env-file=.env.neon scripts/migrate.ts` (cria/atualiza as tabelas).
8. **Operador:** num PowerShell separado (a senha aparece na tela),
   `npx tsx --env-file=.env.neon scripts/create-admin.ts` → deve terminar em "Senha redefinida" ou
   "Operador criado". Senha com 12+ caracteres.
9. **Projeto privado enquanto testa** (só abre para quem está logado na Netlify). Testar página do
   cliente, login, envio e exclusão de foto. Só então **Tornar público**.
10. **Desligar o selo** "Powered by Netlify": Configuração do projeto → Geral → selo → desligar.

## Armadilhas já encontradas (e a correção)

| Sintoma                                                   | Causa                                                                                                                                                                        | Correção                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Todas as páginas: "Internal Server Error"                 | A Netlify injeta `ANTHROPIC_API_KEY` própria (AI Gateway) em outro formato e o sistema recusava iniciar                                                                      | Corrigido no código: chave de outro formato só desliga a IA; o cliente da API ignora `ANTHROPIC_BASE_URL`                                                                                                                                                                                                         |
| "This page couldn't load", log com `mkdir '.data/pglite'` | `DATABASE_URL` vazio na Netlify (o `&` do link do Neon cortou o valor no shell)                                                                                              | Usar `scripts/netlify-env.ts` (lê o arquivo sem shell e confere tamanhos)                                                                                                                                                                                                                                         |
| Deploy falha logo na build                                | Variáveis não cadastradas                                                                                                                                                    | `scripts/netlify-env.ts` antes do primeiro deploy                                                                                                                                                                                                                                                                 |
| API recusa "secret"/escopos                               | Plano grátis não permite                                                                                                                                                     | Variáveis comuns; só a conta da Netlify vê os valores                                                                                                                                                                                                                                                             |
| Páginas respondem 401                                     | Projeto ainda privado                                                                                                                                                        | Normal até "Tornar público"                                                                                                                                                                                                                                                                                       |
| Link do Neon "sumiu"                                      | Bloco de Notas salvou em outra pasta como `.env.neon..txt`                                                                                                                   | Abrir o arquivo do projeto pelo caminho completo; conferir com o assistente                                                                                                                                                                                                                                       |
| Arquivo `ProjetosPlataformaSites.env.neon` na pasta       | Comando com `\` no terminal do assistente (as barras somem)                                                                                                                  | Usar `/` nos caminhos; arquivo apagado (tinha senha e não era ignorado pelo Git)                                                                                                                                                                                                                                  |
| Login: "E-mail ou senha incorretos" na produção           | E-mail digitado diferente do operador (é `romulonascimento091@`, não o `…0009@` do Git/Google); `create-admin.ts` sem `--env-file=.env.neon` grava no banco local            | Conferir o e-mail do operador no banco; a senha é a mesma do local; redefinir só com `--env-file=.env.neon` (Parte B, passo 8)                                                                                                                                                                                    |
| Selo "Powered by Netlify" no canto                        | Padrão do plano grátis desde 19/08/2026                                                                                                                                      | Desligar no painel (Parte B, passo 10)                                                                                                                                                                                                                                                                            |
| Servidor local "fantasma" segura o banco                  | Parar a tarefa não matou o processo do Next                                                                                                                                  | Encerrar os `node.exe` do projeto antes de scripts no banco local                                                                                                                                                                                                                                                 |
| Métricas locais com visitas que ninguém fez               | Capturas de conferência abrem a página pública e o rastreador conta (o perfil `devices["Pixel 7"]` do Playwright troca o userAgent e escapa do filtro — visto em 2026-10-26) | Capturar com um navegador identificado como robô (userAgent com "HeadlessChrome"; com perfil de celular, passar `userAgent` próprio com "HeadlessChrome"): `isBot` descarta. Se já contou, apagar os eventos do horário das capturas (listar antes); na produção, conferir pela prévia, nunca pela página pública |

| Vídeo não abre no Playwright | O Chromium dos testes não decodifica H.264 (MP4) | Conferir MP4 com `channel: "chrome"`; nos E2E usar WebM gravado no próprio navegador |
| Prévia do protótipo sem máscara/luz | Máscaras CSS e vídeo não carregam por `file://` | Servir a pasta `prototipos/` por HTTP local |
| Orçamento sem mensagem pronta | O link `wa.me/message/…` (WhatsApp Business) e o de grupo não aceitam texto | Usar o **número** em Contato (o da arte da cliente); conferir que `wa.me/<número>?text=` leva o texto |
| Schema recusa a cor de um ícone | Desenho branco sobre cor clara (ex.: dourado #c27800, 2,89:1; mínimo 3) | Escurecer a cor (#a86400 passou) |
| Clique do teste não acontece no botão "desligado" | O Playwright respeita `aria-disabled` | `click({ force: true })` para provar que nada é enviado |
| Fundo branco "cansa a vista" (Casa Limpa) | Fundo claro demais no protótipo | O usuário mandou a referência do azul; pedir referência de fundo logo no começo |

## Vídeos (D50)

- Até **30 MB e 60 s** por vídeo; enviar pela aba Imagens → Vídeos. **MP4 (H.264)** é o mais seguro; no iPhone:
  Ajustes → Câmera → Formatos → **Mais compatível** (HEVC pode não abrir no Android/Windows).
- O painel recusa ainda no navegador o que não abre ali. A capa vira uma imagem do cliente (não excluir).
- Banda da Netlify grátis: cada play baixa o vídeo inteiro aos pedaços — preferir trechos curtos (10–20 s).
- Código novo com tabela nova: na produção, `npx tsx --env-file=.env.neon scripts/migrate.ts` **antes** de
  copiar o cliente (o script de cópia já leva a tabela `videos` e as partes).

## Antes de chamar a produção de "pronta" (pendências do piloto)

- [x] Login do operador funcionando na produção (2026-10-22; era o e-mail errado no login).
- [ ] Código de login no celular (2FA, P5b) — obrigatório; o operador só entra no painel da produção com ele.
- [ ] Proteção das páginas (CSP, P9).
- [ ] Cópia de segurança diária do banco e das fotos (o Neon grátis guarda só 6 h; a Netlify pode
      encerrar projetos grátis sem aviso).
- [ ] Testar envio e exclusão de foto pelo painel na produção.
- [ ] Apagar o arquivo da Área de Trabalho com a senha do banco (`meu banco de dados/turso_database_url/.env.neon..txt`).
- [ ] Revogar o token pessoal da Netlify quando não precisar mais (ou deixar expirar).

## Comandos de referência

| O quê                                        | Comando                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| Atualizar tabelas na produção                | `npx tsx --env-file=.env.neon scripts/migrate.ts`                            |
| Copiar cliente do computador para a produção | `npx tsx --env-file=.env.neon scripts/copy-client-to-prod.ts <slug>`         |
| Enviar variáveis e publicar                  | `npx tsx scripts/netlify-env.ts --deploy`                                    |
| Senha do operador na produção                | `npx tsx --env-file=.env.neon scripts/create-admin.ts` (PowerShell separado) |
| Publicar código novo                         | `npm run check` → `git push` (a Netlify publica sozinha)                     |
| Ver erros da produção                        | Netlify → Logs → Funções → `___netlify-server-handler`                       |
