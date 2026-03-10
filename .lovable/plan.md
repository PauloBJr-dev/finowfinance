

# Adicionar status visual "Fatura Futura" nas faturas

## Regra de negócio

Nos apps de grandes bancos (Nubank, Inter), apenas a fatura do ciclo atual é "Aberta". Faturas de meses posteriores aparecem como "Futura". No banco de dados todas continuam com `status = 'open'`, mas na **interface** diferenciamos:

- **Aberta**: fatura `open` cujo `closing_date` pertence ao mês atual ou já passou (ciclo corrente)
- **Futura**: fatura `open` cujo `closing_date` é de um mês posterior ao atual
- **Fechada**, **Paga**: mantêm comportamento atual

Não é necessária alteração no banco de dados — é uma derivação puramente visual/client-side.

## Arquivos modificados

### `src/pages/Faturas.tsx`
- Adicionar entrada `future` no `statusConfig` com label "Futura" e estilo azul/cinza sutil
- Criar função `getDisplayStatus(invoice)` que retorna `'future'` se `status === 'open'` e `closing_date` é de um mês futuro, caso contrário retorna o status original
- Usar `getDisplayStatus` em vez de `currentInvoice.status` para determinar o badge
- Faturas "future" **não** mostram botão "Pagar Fatura" (já coberto pelo `canPay` pois geralmente `computedTotal === 0`, mas reforçar)

### `src/components/dashboard/CurrentInvoicesCard.tsx`
- Adicionar entrada `future` no `STATUS_CONFIG` local
- Aplicar mesma lógica de derivação do status visual

## Visual do badge "Futura"
- Estilo: `bg-blue-500/15 text-blue-600 border-blue-500/30` (tom azul neutro, diferente de "Aberta")
- No dashboard card: dot `bg-blue-500`

