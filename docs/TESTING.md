# Testes

## Camadas

| Camada         | Ferramenta                                      | Onde               | Quando                                                                                       |
| -------------- | ----------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Unitário       | Vitest                                          | `src/**/*.test.ts` | Lógica pura: schemas, operações do editor, chaves de armazenamento, validação de saída da IA |
| E2E            | Playwright (Chromium, desktop + Pixel 7)        | `e2e/*.spec.ts`    | Fluxos completos do operador e sites gerados                                                 |
| Acessibilidade | `@axe-core/playwright` (tags WCAG 2A/2AA/2.2AA) | dentro dos E2E     | Toda página nova do painel e todo tipo de seção                                              |
| Estático       | ESLint, `tsc` (com `next typegen`), Prettier    | `npm run check`    | Antes de cada commit                                                                         |

## Ambiente E2E

- `playwright.config.ts` sobe `next dev` na porta 3100 com variáveis próprias (banco `.data/e2e/pglite`, segredo de teste, operador fictício `E2E_ADMIN`).
- `scripts/e2e-prepare.ts` apaga `.data/e2e`, aplica migrações e cria o operador antes do servidor iniciar. Recusa apagar fora de `.data/e2e/`.
- Testes rodam em série (`workers: 1`) porque o PGlite admite um processo por diretório.
- Testes de rate limit usam `x-forwarded-for` fictício (faixa 203.0.113.0/24) distinto por projeto.

## Regras

- IA nunca é chamada em testes: usar respostas simuladas validadas pelo schema.
- Um bug corrigido ganha um teste que falhava antes.
- Seletores por papel/rótulo acessível (`getByRole`, `getByLabel`), escopados quando houver ambiguidade (o Next injeta um `role="alert"` anunciador de rotas).
