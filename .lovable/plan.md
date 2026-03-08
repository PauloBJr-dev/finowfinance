

## Plano: Card de Fatura Atual no Dashboard

### Conceito de UI
Um card compacto que exibe um resumo por cartão de crédito, mostrando a fatura aberta atual de cada cartão. Se o usuário tiver mais de um cartão, mostra um item por cartão em lista vertical. Se não tiver cartões, o card fica oculto (sem estado vazio).

Layout por cartão:
```text
┌──────────────────────────────────────────────────┐
│  🔖 Faturas Atuais                   Ver todas → │
│─────────────────────────────────────────────────-│
│  ● Nubank          Aberta      R$ 1.234,56      │
│    Vence 10/abr                                  │
│  ● Inter           Aberta      R$ 567,89        │
│    Vence 15/abr                                  │
└──────────────────────────────────────────────────┘
```

Cada linha de cartão: dot colorido por status (verde=open, amarelo=closed, cinza=paid), nome do cartão, badge de status, valor total (com mask de privacidade), data de vencimento. Link "Ver todas" aponta para `/faturas`.

### Arquivos a criar/editar

**1. Novo: `src/components/dashboard/CurrentInvoicesCard.tsx`**
- Hook dedicado interno que busca a fatura aberta/closed (não paga) mais recente de cada cartão ativo
- Query: buscar todos os cartões do usuário + para cada cartão, a fatura com `status != 'paid'` e `deleted_at IS NULL`, ordenada por `closing_date DESC`, limit 1
- Otimização: uma única query com join via supabase (`invoices` filtrado por status + `cards` via card_id)
- Usa `useCards` para lista de cartões, depois uma query de invoices agrupada
- Respeita `usePrivacy` para mascarar valores
- Skeleton loading, oculto se nenhum cartão existe

**2. Editar: `src/hooks/use-dashboard-preferences.ts`**
- Adicionar `current_invoices: true` ao `DEFAULT_PREFS`
- Adicionar label `"Faturas Atuais"` ao `WIDGET_LABELS`

**3. Editar: `src/pages/Dashboard.tsx`**
- Importar `CurrentInvoicesCard`
- Renderizar condicionalmente (`w.current_invoices`) no grid de 2 colunas junto com `UpcomingBillsCard`, ou em sua própria seção antes dos gráficos

### Nenhum arquivo existente será modificado além dos dois listados. Nenhuma tabela ou migração necessária.

