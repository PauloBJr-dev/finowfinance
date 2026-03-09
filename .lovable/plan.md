

# Correção de 3 Bugs: Faturas e KPI de Despesas

## BUG 3 — Excluir despesas de cartão de crédito do KPI

### `src/pages/Dashboard.tsx` (lines 98-103)
- Filtrar `payment_method !== "credit_card"` nos cálculos de `expenses` e `income`
- Adicionar `"Não inclui despesas do cartão de crédito"` abaixo do valor no renderer `kpi_expenses` (line 145)

### `src/hooks/use-dashboard-data.ts` (lines 78-93)
- No `usePreviousMonthTotals`, adicionar `payment_method` ao select e filtrar `credit_card` no forEach
- No `useSixMonthTransactions`, adicionar `payment_method` ao select para que os componentes downstream possam filtrar

### `src/components/dashboard/ExpensesByCategoryChart.tsx` (line 30)
- Adicionar `.filter(t => t.payment_method !== "credit_card")` antes do forEach

### `src/components/dashboard/MicroInsightCard.tsx` (line 40)
- Adicionar filtro `payment_method !== "credit_card"` no `expenseTx`

---

## BUG 1 — Total da fatura calculado dinamicamente

### `src/hooks/use-invoices.ts`
- Expandir `useInvoiceTransactions` para buscar **também** installments vinculados ao `invoice_id`
- Calcular `computedTotal` = soma de transactions **sem** installment_group + soma de installments
- Para detectar transactions com installment_group: fazer left join com `installment_groups` via `transaction_id` ou buscar separadamente os IDs de transactions que têm installment_group
- Retornar `{ transactions, installments, computedTotal }`

### `src/pages/Faturas.tsx`
- No `InvoiceCard` (line 111): usar `computedTotal` em vez de `invoice.total_amount`
- No `canPay` (line 70): usar `computedTotal > 0`
- No `InvoiceTransactions`: exibir também as parcelas (com label "Parcela X/Y")
- No `PayInvoiceModal` (line 170): usar `computedTotal`
- No `usePayInvoice` (line 127): receber `computedTotal` como parâmetro em vez de depender de `invoice.total_amount`

---

## BUG 2 — Parcelas sem invoice_id

### `supabase/functions/transactions/index.ts` (lines ~400-410)
- Após `find_or_create_invoice` para cada parcela, se `instInvoiceId` for null/undefined, **abortar** com erro 500 e log explícito
- Não criar parcela sem invoice_id

### Migration SQL — Reprocessar installments órfãs
Usar `calculate_invoice_cycle` (não `find_or_create_invoice`, pois esta exige `auth.uid()`) com a **data da transação original** (`t.date`) como referência — não o `due_date` da parcela. Lógica:

```text
1. Buscar installments com invoice_id IS NULL
2. Para cada um, obter t.date da transação original via installment_groups → transactions
3. Obter billing_day/due_day do cartão
4. Chamar calculate_invoice_cycle(billing_day, due_day, t.date + (N-1 meses))
5. Fazer lookup/insert da invoice com o closing_date calculado
6. Atualizar installment.invoice_id
```

Tudo envolvido em `BEGIN...EXCEPTION WHEN OTHERS THEN RAISE; END` para rollback automático.

### Migration SQL — Recalcular total_amount de todas as faturas
Recalcular somando transactions sem installment_group + installments, envolvido na mesma transaction.

---

## Arquivos modificados
1. `src/pages/Dashboard.tsx`
2. `src/hooks/use-dashboard-data.ts`
3. `src/components/dashboard/ExpensesByCategoryChart.tsx`
4. `src/components/dashboard/MicroInsightCard.tsx`
5. `src/hooks/use-invoices.ts`
6. `src/pages/Faturas.tsx`
7. `supabase/functions/transactions/index.ts`
8. Migration SQL (1 migration com reprocessamento + recálculo)

