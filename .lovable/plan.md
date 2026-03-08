

## Plano: Barra de progresso de limite no card Faturas Atuais

### Mudança

Arquivo unico: `src/components/dashboard/CurrentInvoicesCard.tsx`

**1. Adicionar `credit_limit` ao `InvoiceSummary`** e populá-lo a partir do `cardMap` (cards já possuem `credit_limit`).

**2. Adicionar barra de progresso** abaixo de cada item de fatura, entre a linha de "Vence..." e o valor. A barra mostra `total_amount / credit_limit` como porcentagem.

- Se `credit_limit` for `0` ou `null`, a barra fica oculta (sem divisão por zero).
- Cor da barra: verde (< 60%), amarelo (60-85%), vermelho (> 85%).
- Texto pequeno abaixo: ex. "42% do limite (R$ 1.234 de R$ 3.000)".
- Usar `Progress` de `@/components/ui/progress` com className override para cor condicional.

**3. Layout ajustado**: mudar de `flex items-center` horizontal para layout vertical por card item — nome+badge+amount no topo, barra de progresso embaixo. Mais legivel com a informação extra.

```text
┌─────────────────────────────────────────────┐
│ ● Nubank        Aberta         R$ 1.234,56  │
│   Vence 10/abr                               │
│   [████████░░░░░░░░░░] 42% do limite         │
└─────────────────────────────────────────────┘
```

### Nenhum outro arquivo modificado.

