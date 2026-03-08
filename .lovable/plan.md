

## Plano: Subtexto no KPI de Vale Refeição

### O que muda
No card KPI de Vale Refeição do Dashboard, adicionar abaixo do valor de saldo um texto pequeno com:
- Quantidade de contas benefit: "X conta(s)"
- Último depósito registrado: "Último depósito: DD/MM/AAAA" (ou "Nenhum depósito" se vazio)

### Implementação

1. **Nova query para último depósito** — No `Dashboard.tsx`, adicionar uma query simples com `useQuery` que busca o depósito mais recente da tabela `benefit_deposits` (ordenado por `date DESC`, limit 1). Habilitada apenas quando `hasBenefit` é true. `staleTime: 5min`.

2. **Renderizar subtexto no card** — Abaixo do `formatCurrency(benefitBalance)`, adicionar:
   ```
   <p className="text-xs text-muted-foreground mt-1">
     {benefitAccounts.length} conta(s) · Último depósito: {formatDate(lastDeposit.date)}
   </p>
   ```

### Arquivos modificados
- `src/pages/Dashboard.tsx` — adicionar query de último depósito + subtexto no card KPI benefit

