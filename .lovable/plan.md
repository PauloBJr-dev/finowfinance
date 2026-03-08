## Plano: Ajustes na Landing Page

### Alterações em `src/pages/LandingPage.tsx`

**1. Atualizar exibição do plano Grátis**

- Linha 620 (FAQ): atualizar texto da resposta "É realmente grátis?" removendo menção a dark mode.

**2. Adicionar personalização no plano Premium**

- Acrescentar ao array `features` do Premium:
  - "Dashboard personalizável" (widgets visíveis/ocultos)
  - "Temas e aparência customizável"

**3. Screenshots do app na Landing Page**
Como não existem screenshots reais no repositório, vou criar uma nova seção **"Veja o Finow em ação"** entre "Como funciona" e "Depoimentos" com mockups estilizados em código (cards glassmorphism simulando telas do app). Serão 3 previews:

- **Dashboard** — mostrando KPIs, gráfico de despesas e saldo
- **Transações** — lista de transações com categorias coloridas
- **Faturas** — card de fatura com status e valor

Cada preview será um card com visual realista do app, usando os mesmos componentes e cores do design system. Serão dispostos em carousel horizontal no mobile e grid no desktop.

### Arquivos


| Arquivo                     | Ação                      |
| --------------------------- | ------------------------- |
| `src/pages/LandingPage.tsx` | Editar — 3 mudanças acima |
