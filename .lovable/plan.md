

# Reescrever `useUpdateTransaction` — direto via cliente Supabase

## Problema
O hook `useUpdateTransaction` chama `supabase.functions.invoke('transactions/${id}', { method: 'PUT' })`, causando erros intermitentes de conexão com a Edge Function.

## Correção
Substituir o `mutationFn` (linhas 214–222) para usar `supabase.from('transactions').update()` diretamente, com lógica de invoice inline. Adicionar invalidação de `['invoices']` no `onSuccess`.

## Detalhes técnicos

**Arquivo**: `src/hooks/use-transactions.ts` (linhas 207–233)

**Mudanças no bloco `useUpdateTransaction`:**

1. **`mutationFn`** — substituir chamada à Edge Function por:
   - Montar objeto `finalUpdates` a partir dos updates recebidos
   - Se `payment_method === 'credit_card'` + `card_id` + `date`: chamar `supabase.rpc('find_or_create_invoice')` e setar `invoice_id`, limpar `account_id`
   - Se `payment_method` != `credit_card`: limpar `invoice_id` e `card_id` com `null`
   - Executar `supabase.from('transactions').update(finalUpdates).eq('id', id).select('*, categories(*), accounts(*), cards(*)').single()`

2. **`onSuccess`** — adicionar `queryClient.invalidateQueries({ queryKey: ['invoices'] })`

3. **JSDoc** — atualizar comentário de "via Edge Function" para "via Supabase client"

**Escopo**: apenas o bloco `useUpdateTransaction` (linhas 207–233). Nenhum outro hook, componente, Edge Function ou SQL alterado.

