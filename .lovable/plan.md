

# Correção: Parcelas de transação excluída ainda aparecem nas faturas

## Problema

Quando uma transação parcelada é soft-deleted (`deleted_at` preenchido), as parcelas (`installments`) vinculadas às faturas continuam aparecendo e sendo somadas no total. Isso acontece por dois motivos:

1. **`useInvoiceDetails`** busca installments por `invoice_id` mas não verifica se a transação-pai foi excluída
2. **`useDeleteTransaction`** não invalida as queries de faturas, então o cache mantém os dados antigos

## Correção

### `src/hooks/use-invoices.ts` — `useInvoiceDetails`

Na query de installments (line 121), adicionar `deleted_at` ao select da transação-pai:

```typescript
.select('*, installment_groups!inner(transaction_id, total_installments, 
  transactions:transaction_id(description, deleted_at, categories(id, name, icon, color)))')
```

Depois, filtrar client-side os installments cuja transação-pai foi soft-deleted:

```typescript
const activeInstalls = (installs ?? []).filter((inst) => {
  const parentTx = inst.installment_groups?.transactions;
  return !parentTx?.deleted_at;
});
```

Usar `activeInstalls` em vez de `installs` no cálculo do total e no retorno.

### `src/hooks/use-transactions.ts` — `useDeleteTransaction`

No `onSuccess` (line 286-289), adicionar invalidação das queries de faturas:

```typescript
queryClient.invalidateQueries({ queryKey: ['invoices'] });
queryClient.invalidateQueries({ queryKey: ['invoice-details'] });
```

Fazer o mesmo no `useRestoreTransaction` para consistência.

## Arquivos modificados
1. `src/hooks/use-invoices.ts` — filtrar installments de transações excluídas
2. `src/hooks/use-transactions.ts` — invalidar cache de faturas ao excluir/restaurar

