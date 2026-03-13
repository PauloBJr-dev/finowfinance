

# Plano: Relatório PDF com transações detalhadas, seção de cartões e pagamentos de fatura

## Escopo

Alterar **apenas** `supabase/functions/reports/index.ts`. Nenhum outro arquivo será tocado.

## Mudanças

### 1. Helper de tradução de payment_method
Adicionar função `translatePaymentMethod(method)` que mapeia os valores do enum para português.

### 2. Queries expandidas
- **Transações**: adicionar `id, payment_method, card_id, invoice_id, cards(name)` ao select
- **Faturas**: nova query buscando faturas no período por `closing_date`, incluindo `cards(name)`

### 3. Classificação de transações (3 grupos)
Iterar sobre as transações e separar em:
- `invoicePayments` — categoria === `'Pagamento de Fatura'` (excluídas do totalExpenses)
- `creditCardTxs` — `payment_method === 'credit_card'` (entram normalmente em despesas)
- `regularTxs` — todas as demais

Para `expensesByCategory` e `incomeByCategory`, armazenar lista de transações individuais por categoria:
```ts
{ name: string; total: number; transactions: { description: string; amount: number; date: string; paymentMethod: string }[] }
```

### 4. Nova função `drawDetailedTable`
Substitui `drawTable`. Para cada categoria:
- Linha de cabeçalho com fundo colorido, nome à esquerda, total à direita (vermelho para despesas, verde para receitas)
- Sub-linhas recuadas: descrição | forma de pagamento | data (dd/mm/aaaa) | valor
- Total geral ao final

### 5. Nova seção "Cartões de Crédito"
Agrupada por cartão → fatura. Para cada fatura:
- Cabeçalho: "Fatura [mês/ano]" — status — total
- Transações vinculadas (filtradas de `transactions` por `invoice_id`)
- Se vazia: "Nenhuma transação no período"

### 6. Nova seção "Pagamentos de Fatura"
Lista simples das transações `invoicePayments` com total ao final. Posicionada antes das seções de IA.

### 7. Card de resumo ajustado
- `totalExpenses` exclui pagamentos de fatura
- Nota `"* Exclui pagamentos de fatura"` em fonte menor abaixo do card de Despesas

### 8. Paginação
`checkPage()` chamado antes de cada linha de transação individual.

## Ordem das seções no PDF

```text
1. Header + Summary Cards (com nota no card Despesas)
2. Despesas por Categoria (detalhado)
3. Receitas por Categoria (detalhado)
4. Cartões de Crédito (por cartão → fatura → transações)
5. Pagamentos de Fatura (lista simples)
6. Seções de IA (sem alteração)
7. Footer (sem alteração)
```

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Editar | `supabase/functions/reports/index.ts` |

Nenhum outro arquivo será modificado.

