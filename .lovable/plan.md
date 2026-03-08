

# Dashboard Fixes Plan

## 3 Changes

### 1. MonthFlowCard — Ensure values never blank
The code logic is correct (`useBillsSummary(new Date())` is called, values default to 0). The `text-accent` color used for "Despesas Previstas" may be invisible in dark mode. Fix: change `text-accent` to `text-orange-400` or `text-yellow-500` for visibility. Also add explicit fallback so values always show `R$ 0,00` even if data is undefined.

### 2. Restore RemindersCard position + add "Ver transações" button
Current order: Header → RemindersCard → Summary Cards → MonthFlowCard → Charts → Bills

New order:
1. Header (greeting)
2. Summary Cards (3-col grid)
3. **"Ver transações" button** — `Link to="/transacoes"`, `Button variant="outline"` with `ArrowRight` icon
4. **RemindersCard** (moved here, between button and MonthFlowCard)
5. MonthFlowCard
6. Charts (2-col grid)
7. UpcomingBillsCard

### Files to modify
- `src/pages/Dashboard.tsx` — reorder components, add Link button
- `src/components/dashboard/MonthFlowCard.tsx` — fix `text-accent` color for dark mode visibility

