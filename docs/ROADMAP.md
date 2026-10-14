# Roadmap

Cada fase só começa com aprovação do usuário. Critério de conclusão = verificado na prática, não apenas escrito.

> Revisado em 2026-10-13 após a mudança de produto para **Bio Sites** (ver `PROJECT.md`, D19–D22). Fases 0–2 mantidas como histórico; o que foi feito nelas é base reaproveitada.

## Fase 0 — Preparação ✅ · Fase 1 — Fundação ✅ · Fase 2 — Núcleo de sites ✅ (2026-10-13)

Reaproveitado na nova direção: login, banco e migrações, armazenamento e mídia (WebP sem EXIF), cadastro de empresas, briefing, isolamento por cliente, documento validado por schema, temas por tokens com contraste AA, prévia, demo por script, infraestrutura de testes (Vitest, Playwright, axe, capturas, Lighthouse).
Substituído: seções em formato "site" (abertura, sobre, serviços…) e roteamento por subdomínio.

## Fase 2B — Bio Site ✅ (2026-10-13)

Concluída: 95 unitários, 41 E2E (desktop + celular; axe sem violações nos 3 demos e no painel), Lighthouse celular 93/92/93 de desempenho e 100 em acessibilidade, boas práticas e SEO. Inclui a edição rápida e a publicação básica (D24).

- `BioDocument`: cabeçalho (logo, nome, frase, categorias, local), faixa em movimento, cartões de ação (WhatsApp, link, cardápio, mapa, telefone, Instagram…; ícone, título, subtítulo, destaque), redes, galeria, horários, texto; botão flutuante do WhatsApp.
- Temas com degradê, padrão ilustrado **próprio** por segmento, borda decorativa, estilo de cartão; modelos iniciais: beleza, alimentação, saúde, serviços.
- Endereço `dominio.com/empresa` (rota na raiz, nomes reservados); subdomínio removido.
- Briefing genérico (campos por segmento).
- **Conclusão:** 1 Bio Site por modelo, montado a partir de dados, revisado em celular/tablet/desktop; axe sem violações; Lighthouse celular ≥ 90; E2E atualizados.

## Fase 3 — Editor visual e versões (operador) ✅ (2026-10-13)

Concluída: 107 unitários, 43 E2E (inclui editar → salvar → aprovar e publicar → restaurar → republicar, em desktop e celular, com axe no editor e nas versões), Lighthouse celular sem regressão (92/100/100/100).

- Prévia de celular com seleção por clique; painel lateral gerado do schema; adicionar/reordenar/ocultar/remover blocos; trocar tema, cores, ícones; desfazer/refazer.
- Versões, restauração, aprovação, publicação/despublicação, cache invalidado ao publicar.
- **Conclusão:** E2E cobre editar → salvar → restaurar → aprovar → publicar; editor utilizável no celular e no desktop.

## Fase 4 — Acesso de clientes por convite ✅ (2026-10-13)

Concluída: 118 unitários, 45 E2E (inclui convite → cliente edita e publica direto → isolamento → auditoria → cancelar convite → remover acesso, em desktop e celular, com axe no convite, no painel do cliente e nas telas Acessos e Atividade).

- Papéis operador/cliente; vínculo empresa↔usuário; convite por link de uso único com validade.
- Cliente vê e edita só o próprio Bio Site, com o mesmo editor (permissões reduzidas); publica direto, sem aprovação do operador (D31).
- Registro de auditoria das alterações.
- **Conclusão:** E2E prova que um cliente não acessa dados, imagens nem rotas de outro; convite expirado/reutilizado é recusado.

## Fase 5 — IA

- Briefing → Bio Site inicial; textos; direção visual; pedidos em linguagem natural com prévia; custo registrado e teto de gasto.

## Fase 6 — Produção

- Segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, deploy, backups testados, monitoramento.
- **Conclusão:** primeiro cliente real publicado.

## Futuro

Cadastro aberto (SaaS) e cobrança; domínios personalizados; analytics; novos segmentos e blocos.
