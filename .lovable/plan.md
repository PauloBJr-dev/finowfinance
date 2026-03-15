

# Plano: Comportamento híbrido no CurrentInvoicesCard

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/dashboard/CurrentInvoicesCard.tsx` |
| Editar (1 linha) | `src/pages/Dashboard.tsx` (linha 240) |

## Alterações em `CurrentInvoicesCard.tsx`

### 1. Imports
Adicionar `format` de `date-fns` e `ptBR` de `date-fns/locale`.

### 2. Props
```ts
interface CurrentInvoicesCardProps {
  selectedPeriod?: { start: string; end: string };
}
export function CurrentInvoicesCard({ selectedPeriod }: CurrentInvoicesCardProps) {
```

### 3. Derivar `isFuturePeriod` e `cardTitle` (antes do return)
```ts
const today = new Date().toISOString().split("T")[0];
const currentMonthStart = today.slice(0, 7) + "-01";
const isFuturePeriod = !!selectedPeriod && selectedPeriod.start > currentMonthStart;
const periodMonthStart = selectedPeriod?.start?.slice(0, 7);

const cardTitle = isFuturePeriod && selectedPeriod
  ? `Faturas de ${format(new Date(selectedPeriod.start + "T12:00:00"), "MMM.", { locale: ptBR })}`
  : "Faturas Atuais";
```

### 4. Substituir bloco de seleção por cartão (linhas 83–109)
Substituir o `Map<string, single>` pelo agrupamento + seleção condicional:
- **Mês futuro**: fatura cujo `closing_date` inicia com `periodMonthStart`
- **Mês atual/passado**: fatura cujo ciclo contém `today`
- **Fallback**: `cardInvoices[0]` (mais recente, pois ordenado DESC)

### 5. Adicionar `selectedPeriod` ao `queryKey`
Para que a query reexecute quando o período muda: `["current-invoices-summary", user?.id, selectedPeriod?.start]`

### 6. Título dinâmico no JSX
Substituir `"Faturas Atuais"` por `{cardTitle}` na linha 127.

## Alteração em `Dashboard.tsx`

Linha 240 — de:
```tsx
current_invoices: () => <CurrentInvoicesCard key="current_invoices" />,
```
Para:
```tsx
current_invoices: () => <CurrentInvoicesCard key="current_invoices" selectedPeriod={{ start: dateRange.startDate, end: dateRange.endDate }} />,
```

Nenhum outro arquivo será modificado.

