# Projeto — visão, escopo e requisitos

> Revisado em 2026-10-13: o produto passou de "sites em seções para beleza" para **plataforma de Bio Sites** (mini site estilo "link na bio") para qualquer segmento. Referência funcional indicada pelo usuário: Nourbiosite (analisada só por captura pública; design deve ser próprio — ver D19).

## Visão

Plataforma para criar e manter **Bio Sites**: uma página única, pensada para o celular, que concentra a identidade do negócio e as ações principais (pedir no WhatsApp, ver cardápio/serviços, agendar, como chegar, redes sociais). Atende qualquer segmento (beleza, alimentação, saúde, serviços…), com identidade visual própria de cada empresa.

Dois tipos de usuário:

- **Operador** (dono da plataforma): cadastra empresas, cria e edita qualquer Bio Site, aprova e publica.
- **Cliente** (empresa convidada pelo operador): edita apenas o próprio Bio Site, conforme sua personalidade.

## Anatomia de um Bio Site (referência funcional)

1. Cabeçalho: logo redondo, nome, frase curta, categorias (ex.: PÃES • BOLOS • SALGADOS), selo de localização; fundo em degradê com padrão ilustrado do segmento e borda decorativa (ex.: onda).
2. Faixa de texto em movimento (opcional, respeita "reduzir movimento").
3. Cartões de ação: ícone, título, subtítulo, seta; destaques opcionais (ex.: "● Atendimento rápido"); o principal pode ter cor cheia.
4. Outros blocos: redes sociais, galeria, horários, texto, mapa/endereço.
5. Botão flutuante do WhatsApp.

## Fluxo principal

1. Operador cadastra a empresa e o briefing.
2. Envia imagens (logo, fotos).
3. Gera o Bio Site a partir de um modelo do segmento (depois, com ajuda da IA).
4. Edita visualmente (blocos, textos, cores, ícones, links).
5. Revisa, aprova e publica em `dominio.com/empresa`.
6. Convida a empresa, que passa a editar o próprio Bio Site.

## Escopo do MVP

Inclui: cadastro de empresas; briefing; imagens; biblioteca de blocos; temas por segmento; editor visual; versões, restauração, aprovação e publicação; endereço `dominio.com/empresa`; SEO e Open Graph; convite de clientes com acesso restrito ao próprio Bio Site.

Fora do MVP: cadastro aberto (SaaS); cobrança; domínios personalizados; analytics avançado; formulários com backend; loja/pedidos.

## Requisitos funcionais

- RF1 CRUD de empresas, com situação (briefing, em edição, aguardando aprovação, publicado).
- RF2 Briefing estruturado por empresa (genérico, com campos por segmento).
- RF3 Upload de imagens otimizado e isolado por empresa.
- RF4 Biblioteca de blocos (cabeçalho, faixa, cartão de ação, redes, galeria, horários, texto, endereço) com variações.
- RF5 Temas e modelos por segmento (cores, fontes, padrão ilustrado, estilo dos cartões).
- RF6 Editor visual na prévia do celular: clicar no bloco, editar no painel, adicionar/reordenar/ocultar/remover, desfazer/refazer.
- RF7 Versões, restauração, aprovação explícita e publicação.
- RF8 Convite de cliente (link com validade); cliente acessa só o próprio Bio Site.
- RF9 Geração e ajustes assistidos por IA, sempre com prévia.

## Requisitos não funcionais

- Segurança: isolamento entre empresas em dados, arquivos e permissões; convites de uso único e com validade; validação no servidor; segredos fora do código.
- Desempenho: Bio Site leve, sem JS desnecessário; meta Lighthouse ≥ 90 no celular.
- Acessibilidade: WCAG 2.2 AA (contraste checado no schema; animações respeitam `prefers-reduced-motion`).
- Editor simples o bastante para um cliente leigo.
- Custos previsíveis; backup; TypeScript estrito; testes nas partes críticas.
- Design **próprio**: padrões de interface comuns (cartões, faixa, chips) sim; marca, ilustrações e layout específicos de terceiros, não.
