

## Plano: 5 Melhorias Prioritárias no Dashboard

### 1. Hook para transações do mês anterior (comparação %)

**`src/hooks/use-dashboard-data.ts`** — Adicionar `usePreviousMonthTransactions(startDate, endDate)` que calcula o mês anterior ao período selecionado e busca income/expenses para comparação percentual.

### 2. Card de Balanço do Mês (Receita - Despesa)

**`src/pages/Dashboard.tsx`** — Adicionar um card "Balanço" na grid de KPIs, mostrando `income - expenses` com cor verde (positivo) ou vermelha (negativo). A grid passa de `grid-cols-2 md:grid-cols-3/4` para acomodar o novo card.

### 3. Ativar MonthFlowCard com sobra projetada

**`src/pages/Dashboard.tsx`** — Importar e renderizar `MonthFlowCard` já existente, passando `income`, `expenses`, `pendingBills` (de `billsSummary.pending + billsSummary.overdue`), e `isLoading`. Posicionar entre os KPIs e os gráficos.

### 4. Comparação percentual vs. mês anterior nos KPIs

**`src/pages/Dashboard.tsx`** — Para cada KPI (Despesas, Receitas, Balanço), calcular `((atual - anterior) / anterior) * 100` e exibir um badge pequeno abaixo do valor: `↑12% vs mês anterior` (verde se favorável, vermelho se desfavorável). Lógica invertida para despesas (aumento = ruim).

### 5. Feed das últimas 5 transações

**`src/components/dashboard/RecentTransactionsCard.tsx`** — Novo componente que usa `useTransactions({ limit: 5 })` e renderiza cada item com `TransactionItem`. Card com título "Atividade Recente" e link "Ver todas" para `/transacoes`. Posicionado no layout do dashboard.

### 6. Micro-insight contextual

**`src/components/dashboard/MicroInsightCard.tsx`** — Novo componente que recebe as transações do período e gera 1 insight textual baseado em regras simples:
- Se despesas > receitas: "Suas despesas superaram as receitas em X este mês."
- Se maior categoria > 40% do total: "Categoria Y representou Z% das suas despesas."
- Se despesas caíram vs mês anterior: "Parabéns! Você gastou X% menos que no mês passado."
- Fallback: "Você teve N transações este mês."

Exibido como um banner sutil com ícone de lâmpada.

### Arquivos afetados
1. `src/hooks/use-dashboard-data.ts` — adicionar hook de mês anterior
2. `src/pages/Dashboard.tsx` — integrar tudo
3. `src/components/dashboard/RecentTransactionsCard.tsx` — novo
4. `src/components/dashboard/MicroInsightCard.tsx` — novo

