

# Bug Fix — `calculate_invoice_cycle`: `>` → `>=`

## Correção

Uma única migration SQL que recria a função `calculate_invoice_cycle` alterando a condição de `>` para `>=`:

```sql
IF p_transaction_date >= v_closing_date THEN
```

## Escopo

- **1 migration SQL** — `CREATE OR REPLACE FUNCTION public.calculate_invoice_cycle`
- **0 alterações** em código frontend, edge functions ou qualquer outro arquivo
- A função é idêntica à atual, exceto pela linha da condição

## Resultado

Compra no dia de fechamento (ex: billing_day=1, compra em 01/03) → avança para o próximo ciclo (Abril), como esperado pela regra de negócio.

