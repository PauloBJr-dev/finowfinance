

## Correção: getOrCreateInvoice usa billing_day para calcular mês correto

### Arquivo: `src/hooks/use-invoices.ts`

Substituir linhas 61-63 (o bloco que chama `getOrCreateInvoice` com `new Date()`) pelo trecho que:
1. Busca `billing_day` do cartão via Supabase
2. Usa `getTargetInvoiceMonth` de `invoice-cycle.ts` para calcular o mês alvo correto
3. Passa esse mês correto para `getOrCreateInvoice`

Nenhum outro arquivo será tocado.

