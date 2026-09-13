---
description: Convenções de Usabilidade, Acessibilidade Sênior e Clean Architecture
globs: ["**/*"]
always_on: true
---

# Convenções de Usabilidade, Acessibilidade Sênior e Arquitetura

1. **Acessibilidade Sênior (WCAG 2.1 AA):**
   - Alvos de toque (touch targets) mínimos de 48x48dp (preferencialmente >= 56dp para botões principais).
   - Tipografia clara de alta legibilidade, contrastes de cor adequados.
   - Entradas numéricas diretas, sem sobrecarregar com campos desnecessários.

2. **Clean Architecture e Desacoplamento:**
   - A camada de domínio (`src/domain/`) deve ser 100% pura (Typescript puro, sem dependências de UI ou frameworks).
   - O motor de cálculo clínico (`insulinEngine.ts` e `hba1cEngine.ts`) deve possuir cobertura exaustiva de testes unitários.

3. **Offline-First e Resiliência:**
   - Operação 100% autônoma sem requisições de rede.
   - Persistência transacional segura com SQLite / SecureStore.
