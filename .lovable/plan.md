

# Corrigir lógica de status "Aberta" vs "Futura"

## Problema
A função `getDisplayStatus` compara o mês do `closing_date` com o mês atual do calendário. O cartão Nu tem `billing_day=3`, então compras de março vão para a fatura de Abril (closing_date em abril). Como abril > março, a fatura é marcada como "Futura" — mas ela é a fatura **atual** que está recebendo lançamentos.

## Solução
Usar `cycle_start_date` e `cycle_end_date` da fatura para determinar se o dia de hoje está dentro do ciclo. Se hoje pertence ao ciclo da fatura, ela é "Aberta". Se o ciclo ainda não começou, ela é "Futura".

## Lógica corrigida em `getDisplayStatus`

```text
Se status != 'open' → retorna status original
Se hoje >= cycle_start_date da fatura → "open" (Aberta)
Se hoje < cycle_start_date → "future" (Futura)
```

Isso garante que:
- Fatura de Abril (ciclo 04/mar – 03/abr) com hoje = 10/mar → **Aberta**
- Fatura de Maio (ciclo 04/abr – 03/mai) com hoje = 10/mar → **Futura**
- Quando Abril for paga e o mês avançar para abril, Maio passará a ser "Aberta" automaticamente

## Arquivo modificado
- `src/pages/Faturas.tsx` — apenas a função `getDisplayStatus` (linhas 37-46)
- `src/components/dashboard/CurrentInvoicesCard.tsx` — mesma correção na função `getDisplayStatus` local

Sem alteração no banco de dados. Sem alteração em outros arquivos.

