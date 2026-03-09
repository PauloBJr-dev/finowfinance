

# Bug Fix — useUpdateTransaction: evitar chamada desnecessária a find_or_create_invoice

## Problema
O hook chama `find_or_create_invoice` em toda edição de transação de cartão de crédito, mesmo quando apenas valor ou categoria mudaram. Isso causa erros desnecessários.

## Correção

### 1. `src/hooks/use-transactions.ts` (linhas 214-247)
- Adicionar `_originalTransaction` como parâmetro opcional no `mutationFn`
- Só chamar RPC quando `date` ou `card_id` realmente mudaram vs. original, ou quando `invoice_id` original não existe
- Manter lógica de limpeza para mudança de método de pagamento inalterada

### 2. `src/components/transactions/TransactionForm.tsx` (linhas 85-95)
- Passar `_originalTransaction: { date, card_id, invoice_id }` da transação original no `mutateAsync`

## Escopo estrito
- 2 arquivos, blocos mínimos
- 0 alterações em Edge Functions, SQL ou outros componentes

