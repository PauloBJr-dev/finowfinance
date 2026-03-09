

# Fix timezone bug na edição e agrupamento de transações

## Análise do código atual

**TransactionForm.tsx linha 55**: Usa `new Date(transaction.date + 'T12:00:00')` — tentativa parcial de fix, mas `T12:00:00` sem offset ainda pode causar problemas dependendo do parser. A abordagem com `split('-')` é mais segura.

**TransactionForm.tsx linha 82**: Já usa `formatDateLocal(date)` — **já está correto**, não precisa mudar.

**TransactionList.tsx linhas 46-47**: Usa `new Date(tx.date)` + `.toISOString().split('T')[0]` — bug clássico de UTC. Precisa fix.

## Alterações

### 1. `src/components/transactions/TransactionForm.tsx` (linha 55)
Substituir `new Date(transaction.date + 'T12:00:00')` por parsing manual com `split('-')`:
```typescript
const [year, month, day] = transaction.date.split('-').map(Number);
setDate(new Date(year, month - 1, day));
```
Linha 82 (`formatDateLocal`) já está correta — sem alteração.

### 2. `src/components/transactions/TransactionList.tsx` (linhas 46-47)
Substituir parsing UTC por local:
```typescript
const [y, m, d] = tx.date.split('-').map(Number);
const txDate = new Date(y, m - 1, d);
const dateKey = tx.date;
```

**Escopo**: 2 linhas em cada arquivo, zero impacto em outros componentes.

