

## Plano: Tela de Faturas + Hook use-invoices

5 arquivos tocados: 2 novos, 3 editados.

---

### 1. `src/hooks/use-invoices.ts` (novo)

Conteúdo exato fornecido pelo usuário. Contém:
- `getOrCreateInvoice()` — chama RPC `get_or_create_monthly_invoice`
- `useInvoices(cardId)` — lista faturas de um cartão
- `useInvoiceTransactions(invoiceId)` — transações de uma fatura
- `usePayInvoice()` — pagamento integral (cria transação de despesa + marca fatura como paid)

---

### 2. `src/pages/Faturas.tsx` (novo)

Estrutura:
- Header com título e subtítulo
- Seletor de cartão (Select dropdown usando `useCards()`)
- Empty state se sem cartões: mensagem + botão "Ir para Configurações" → `/configuracoes`
- Lista de faturas (`useInvoices(selectedCardId)`):
  - Card por fatura com: mês/ano (usando `formatInvoiceMonth` de invoice-cycle.ts), badge de status, período do ciclo (usando `formatCyclePeriod` de invoice-cycle.ts), vencimento, total (`formatCurrency`)
  - Fatura open: `border-l-4 border-primary`
  - Clique expande para mostrar transações (`useInvoiceTransactions`)
  - Botão "Pagar Fatura" em faturas open/closed com total > 0
- Modal de pagamento (Dialog):
  - Total, seletor de conta (`useAccounts()`), campo data (default hoje), aviso sobre pagamento integral
  - Botões "Confirmar Pagamento" e "Cancelar"
  - Chama `usePayInvoice()`

---

### 3. `src/App.tsx` (editar)

- Adicionar lazy import: `const Faturas = lazy(() => import("./pages/Faturas"));`
- Adicionar rota: `<Route path="/faturas" element={<ProtectedRoute><Faturas /></ProtectedRoute>} />`

---

### 4. `src/components/navigation/navigation-items.ts` (editar)

- Importar `Receipt` de lucide-react
- Adicionar item "Faturas" no `primaryItems` entre "Contas a pagar" e o fim do array:
  ```
  { to: "/faturas", icon: Receipt, label: "Faturas" }
  ```
  (Fica no grupo primário pois é feature core, não premium)

---

### 5. Nenhuma outra alteração

Sidebar e BottomNav já consomem `primaryItems`/`secondaryItems` dinamicamente — adicionar o item em navigation-items.ts é suficiente.

