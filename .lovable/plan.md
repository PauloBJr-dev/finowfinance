

# Bug Fix — Data regride um dia ao salvar (timezone)

## Diagnóstico confirmado

Encontrei 7 pontos em 4 arquivos de formulário que usam `.toISOString().split("T")[0]` para serializar datas selecionadas pelo usuário antes de enviar ao backend. Esses são os que causam o bug de timezone.

**Não serão alterados:** filtros (`PeriodFilter`, `ExportReportModal`, `Relatorios`, `use-bills`), exibição (`TransactionList`) e edge functions (server-side, sem input de usuário).

## Correção

### 1. Adicionar `formatDateLocal` em `src/lib/format.ts`
```typescript
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 2. Substituir nos formulários

| Arquivo | Linhas | Ocorrências |
|---------|--------|-------------|
| `TransactionForm.tsx` | 68 | 1 (edição) |
| `QuickAddModal.tsx` | 148, 238, 280, 288 | 4 (criação tx, parcelas, bill, tx normal) |
| `PayBillModal.tsx` | 53 | 1 (pagamento conta) |
| `BenefitDepositModal.tsx` | 77, 112 | 2 (default value do form) |

Cada `.toISOString().split("T")[0]` será substituído por `formatDateLocal(date)`, importando de `@/lib/format`.

### Escopo estrito
- **0 componentes novos**
- **0 alterações em lógica de exibição, filtros ou SQL**
- **5 arquivos** tocados (1 utilitário + 4 formulários)

