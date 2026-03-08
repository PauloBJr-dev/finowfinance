

# Plano: Remover Faturas, Cartões (CRUD) e Benefícios — Simplificar para Transações Puras

## Resumo

Remover toda a lógica de faturas, gestão de cartões (CRUD em Configurações), benefícios (VA/VR) e parcelamento. Manter `credit_card` como opção de forma de pagamento, mas sem vínculo a faturas. Transações passam a ser simples: registrar e visualizar.

---

## O que será removido

### Páginas e Rotas
- **Página `Faturas.tsx`** — remover rota `/faturas` do `App.tsx`
- **Navegação "Faturas"** — remover de `navigation-items.ts`

### Componentes
- `src/components/cards/` (CardForm, CardList) — deletar pasta inteira
- `src/components/benefits/` (BenefitCardForm, BenefitCardList, BenefitDepositForm, BenefitDepositHistory) — deletar pasta inteira

### Hooks
- `src/hooks/use-cards.ts` — deletar
- `src/hooks/use-invoices.ts` — deletar
- `src/hooks/use-benefit-deposits.ts` — deletar

### Libs
- `src/lib/invoice-utils.ts` — deletar
- `src/lib/installment-utils.ts` — deletar

### Edge Functions
- `supabase/functions/cards/` — deletar
- `supabase/functions/invoices/` — deletar
- `supabase/functions/pay-invoice/` — deletar
- `supabase/functions/close-invoices/` — deletar
- `supabase/functions/installments/` — deletar

---

## O que será modificado

### `src/pages/Configuracoes.tsx`
- Remover abas "Cartões" e "Benefícios" (manter Contas, Perfil, IA)

### `src/pages/Dashboard.tsx`
- Remover card "Fatura Atual" e card "Benefícios"
- Remover imports de `useInvoices`, `useBenefitCardsTotal`, `formatInvoiceMonth`
- Grid passa de 5 colunas para 3

### `src/components/transactions/QuickAddModal.tsx`
- Remover toda lógica de seleção de fatura (invoice selector)
- Remover lógica de parcelamento (campo de parcelas)
- Remover imports de `useCards`, `useAvailableInvoices`, `formatInstallmentPreview`
- Simplificar: apenas tipo, valor, data, categoria, método de pagamento, conta, descrição
- `credit_card` continua como opção de pagamento mas sem vincular a cartão/fatura

### `src/hooks/use-transactions.ts`
- Remover toda lógica de parcelamento (installment_groups, installments, RPCs de fatura)
- Remover `selected_invoice_id` do `CreateTransactionParams`
- Remover invalidação de `INVOICES_KEY`
- Transação é um insert simples, sem buscar faturas

### `src/components/shared/PaymentMethodSelect.tsx`
- Remover opção `benefit_card`

### `src/components/navigation/navigation-items.ts`
- Remover item "Faturas"

### `src/App.tsx`
- Remover import e rota de `Faturas`

---

## O que NÃO será alterado no banco de dados

As tabelas (`cards`, `invoices`, `installments`, `installment_groups`, `benefit_deposits`) permanecerão no banco para preservar dados históricos. Apenas o frontend e Edge Functions deixam de usá-las.

---

## Ordem de implementação

1. Remover arquivos (hooks, componentes, edge functions, libs, página Faturas)
2. Atualizar `App.tsx` e navegação
3. Simplificar `Dashboard.tsx`
4. Simplificar `Configuracoes.tsx`
5. Simplificar `QuickAddModal.tsx` e `use-transactions.ts`
6. Limpar `PaymentMethodSelect.tsx`

