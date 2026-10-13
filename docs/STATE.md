# Estado atual

Atualizado: 2026-10-13 · **Produto redefinido para Bio Sites** · Fase 2B aguarda aprovação.

## Onde estamos

- Fases 0, 1 e 2 concluídas e commitadas (`46ee75e`). Verificação da Fase 2: 80 unitários, 33 E2E, Lighthouse celular 93/100/100/100.
- Após ver o resultado, o usuário indicou que o produto desejado é uma **plataforma de Bio Sites** (referência: Nourbiosite). Decisões D19–D22 em `DECISIONS.md`; visão em `PROJECT.md`; plano em `ROADMAP.md`.
- O ai-site-cloner foi analisado (sem instalar) e descartado (D20).
- Código ainda reflete a Fase 2 (sites em seções, subdomínios). Nada foi alterado no código após a mudança de rumo.

## Ambiente

- Windows 11, PowerShell 5.1, Node 24.21.0, npm 11.19.0, Git 2.55.0, Chromium do Playwright 1.63. Ausentes: Python, Docker.
- Banco local `.data/pglite` contém a conta do operador. **Não apagar.**
- Servidor de desenvolvimento: `npm run dev` (fica ativo só enquanto o terminal/sessão estiver aberto).

## Skills / plugins

- `frontend-design` instalada (projeto); não carregou na sessão em que foi instalada — conferir em sessão nova.

## Pendências

- **Do usuário:** aprovar o plano da Fase 2B; se possível, enviar mais capturas da referência (editor, outros modelos, outros blocos); P6 (domínio), P7 (conta da API da Claude), P11 (publicação por clientes).
- Técnicas: segundo fator (P5b), CSP (P9), desempenho (P10), driver R2, cache do Bio Site publicado.

## Próximo passo

Fase 2B — Bio Site (`ROADMAP.md`): `BioDocument` com blocos, temas por segmento com padrões ilustrados próprios, endereço `dominio.com/empresa`, modelos iniciais (beleza, alimentação, saúde, serviços).
