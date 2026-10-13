# Projeto — visão, escopo e requisitos

## Visão

Ferramenta interna, operada somente pelo dono, para produzir sites de apresentação personalizados para clientes de forma rápida, com qualidade profissional e custo previsível. Começa com profissionais da beleza (cabeleireiras, manicures, esteticistas, maquiadoras, barbeiros etc.) e deve ser extensível a outros segmentos.

## Fluxo principal

1. Cadastrar cliente.
2. Coletar briefing (dados do negócio, serviços, preços opcionais, contatos, redes sociais, link de agendamento, preferências visuais).
3. Enviar imagens (logo, fotos de trabalhos, ambiente, equipe).
4. Gerar primeira versão assistida por IA (estrutura, textos, direção visual).
5. Editar visualmente (selecionar elemento → alterar texto, imagem, cor, fonte, link, seção).
6. Revisar e aprovar.
7. Publicar em subdomínio.
8. Manter: editar, versionar, restaurar, republicar.

## Escopo do MVP

Inclui: cadastro de clientes; briefing; upload de imagens; geração de site por IA a partir de um conjunto fixo de seções; editor visual com painel de propriedades; rascunho, histórico de versões e restauração; aprovação explícita; publicação em subdomínio; tema (cores, fontes) por site; SEO básico (title, description, Open Graph); botão de WhatsApp / agendamento.

Fora do MVP (futuro): domínios personalizados; acesso do cliente final; múltiplos operadores; pagamentos/cobrança; blog; formulários com backend; analytics avançado; templates de outros segmentos (a arquitetura deve permitir, mas não serão construídos agora).

## Requisitos funcionais (MVP)

- RF1 CRUD de clientes, com status (briefing, em edição, aguardando aprovação, publicado).
- RF2 Briefing estruturado, salvo por cliente.
- RF3 Upload de imagens com redimensionamento/otimização automáticos, isolados por cliente.
- RF4 Biblioteca de seções (ex.: hero, sobre, serviços, galeria, depoimentos, contato/localização, agendamento, redes sociais, rodapé) com variações visuais.
- RF5 Geração assistida por IA da configuração inicial do site a partir do briefing.
- RF6 Editor visual: pré-visualização fiel; clique seleciona seção/campo; edição por formulário gerado a partir do schema; reordenar, adicionar, ocultar e remover seções; desfazer/refazer.
- RF7 Pedidos de alteração em linguagem natural para mudanças complexas, sempre com prévia antes de aplicar.
- RF8 Versionamento: cada salvamento cria versão; comparar e restaurar.
- RF9 Publicação somente de versão aprovada; despublicar.
- RF10 Pré-visualização em larguras de celular, tablet e desktop.

## Requisitos não funcionais

- Segurança: login forte do operador; autorização em todas as rotas administrativas; validação no servidor; uploads seguros; segredos fora do código.
- Desempenho dos sites publicados: carregamento rápido em 4G (meta: Lighthouse ≥ 90 em performance e acessibilidade no celular).
- Acessibilidade: meta WCAG 2.2 AA nos sites gerados e no painel.
- Responsividade: mobile first.
- Custos previsíveis: preferir planos fixos ou com teto; registrar consumo de IA por chamada e por cliente; limite de gasto configurável.
- Backup: banco com backup automático e restauração testada; armazenamento de arquivos com versionamento ou cópia.
- Manutenibilidade: TypeScript estrito, schema único compartilhado entre editor, IA e renderização; testes automatizados nas partes críticas.
- Extensibilidade: novos segmentos = novas seções/presets, sem mudar o núcleo.
