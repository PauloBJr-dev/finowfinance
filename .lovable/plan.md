

# Bug Fix — PUT /transactions: adicionar payment_method, card_id, account_id

## Correção

No handler PUT de `supabase/functions/transactions/index.ts`, inserir entre as linhas 524 e 526 (após tags, antes do check de `Object.keys`):

1. **Mapear os 3 campos faltantes** (`payment_method`, `account_id`, `card_id`)
2. **Se `credit_card` + `card_id` + `date`**: chamar RPC `find_or_create_invoice` → incluir `invoice_id`
3. **Se não `credit_card`**: limpar `invoice_id` e `card_id` com `null`

```text
Linhas 522-531 (antes):
  tags...
  if (Object.keys(updates).length === 0) { ... }

Linhas 522-531 (depois):
  tags...
  + payment_method mapping
  + account_id mapping  
  + card_id mapping
  + invoice recalculation logic
  if (Object.keys(updates).length === 0) { ... }
```

## Escopo

- **1 arquivo**: `supabase/functions/transactions/index.ts`
- **Apenas bloco PUT** — ~15 linhas inseridas entre linhas 525 e 526
- 0 alterações em POST, DELETE, PATCH, frontend ou SQL

