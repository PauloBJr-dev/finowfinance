

# Dashboard Enhancement Plan

## Overview
Add financial visualizations and cash flow projections to the Dashboard: category donut chart, income vs expenses bar chart (6 months), month flow card, and upcoming bills section.

## New Files

### 1. `src/hooks/use-dashboard-data.ts`
Custom hook to fetch 6-month transaction history with category grouping. Uses `useTransactions` with date filters for each of the last 6 months. Also a hook for upcoming bills (next 3 pending/overdue, ordered by due_date).

### 2. `src/components/dashboard/ExpensesByCategoryChart.tsx`
- Recharts `PieChart` (donut via `innerRadius`)
- Groups current month expenses by `categories.name`
- Color palette derived from primary green: `#1F7A63`, `#2A9D7E`, `#35C099`, `#4DD9B4`, `#7AE5CA`, `#A8F0DE`
- Skeleton: circular placeholder; Empty: friendly message "Sem despesas este mes"

### 3. `src/components/dashboard/IncomeVsExpensesChart.tsx`
- Recharts `BarChart` with `ResponsiveContainer`
- 6 bars grouped by month (income green, expenses destructive red)
- Uses `formatMonthShort` for labels, `formatCurrency` for tooltips
- Skeleton: rectangular bars placeholder; Empty state

### 4. `src/components/dashboard/MonthFlowCard.tsx`
- Three indicators in a single Card:
  - **Saldo do mes**: income - expenses (from existing monthly data)
  - **Despesas previstas**: sum of pending/overdue bills for current month (from `useBillsSummary`)
  - **Saldo projetado**: monthly balance - pending bills
- Color-coded values (green positive, red negative)

### 5. `src/components/dashboard/UpcomingBillsCard.tsx`
- Lists next 3 upcoming bills (pending, not deleted, ordered by due_date ASC)
- Each item: description, `formatCurrency(amount)`, due date, countdown ("vence em X dias" / "vencida ha X dias")
- Overdue items: red badge/indicator
- Empty: "Nenhuma conta a pagar pendente"

## Modified Files

### `src/pages/Dashboard.tsx`
Restructure layout:
- Row 1: existing 3 summary cards (Saldo, Despesas, Receitas)
- Row 2: MonthFlowCard (full width or split)
- Row 3: `grid md:grid-cols-2` with donut chart + bar chart
- Row 4: UpcomingBillsCard
- Remove the bottom buttons row, keep RemindersCard

## Data Fetching Strategy
- Monthly transactions: reuse existing `useMonthlyTransactions()`
- 6-month history: new query in `use-dashboard-data.ts` fetching transactions from 6 months ago to now, then grouping client-side by month
- Bills: reuse `useBills` with current month filter + `useBillsSummary`
- Upcoming bills: new query fetching 3 nearest pending bills with `due_date >= today`

## Design Tokens
- Chart green palette: `#1F7A63`, `#2A9D7E`, `#35C099`, `#4DD9B4`, `#7AE5CA`, `#A8F0DE`
- Income bar: `hsl(var(--primary))`
- Expense bar: `hsl(var(--destructive))`
- All cards use existing `Card` component with dark mode compatibility
- Recharts text fills use `hsl(var(--muted-foreground))`

