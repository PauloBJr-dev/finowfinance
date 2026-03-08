

## Plano: Dashboard Personalizável

### Conceito

Adicionar um painel de personalização onde o usuário liga/desliga cada widget do dashboard. Preferências salvas em `localStorage` para persistência imediata sem necessidade de backend.

### Widgets controláveis

| ID | Nome | Default |
|---|---|---|
| `micro_insight` | Micro Insight | on |
| `kpi_balance` | Saldo Total | on |
| `kpi_expenses` | Despesas | on |
| `kpi_income` | Receitas | on |
| `kpi_net` | Balanço do Mês | on |
| `kpi_benefit` | Vale Refeição | on |
| `month_flow` | Fluxo do Mês | on |
| `reminders` | Lembretes | on |
| `expenses_chart` | Despesas por Categoria | on |
| `upcoming_bills` | Próximos Vencimentos | on |
| `recent_transactions` | Atividade Recente | on |

### Implementacao

**1. Hook `src/hooks/use-dashboard-preferences.ts`** (novo)
- Lê/grava `localStorage` key `finow_dashboard_prefs`
- Retorna `{ visibleWidgets, toggleWidget, resetDefaults }`
- Tipo: `Record<string, boolean>`

**2. Componente `src/components/dashboard/DashboardCustomizer.tsx`** (novo)
- Botão de engrenagem no header do dashboard que abre um Sheet (sidebar)
- Lista todos os widgets com Switch para ligar/desligar
- Botão "Restaurar padrões"
- Preview imediato: ao desligar, widget some do dashboard em tempo real

**3. `src/pages/Dashboard.tsx`** (editar)
- Importar hook e customizer
- Envolver cada widget/seção com `{prefs.widget_id && <Component />}`
- Adicionar botão de personalização no header ao lado do título

### Arquivos
1. `src/hooks/use-dashboard-preferences.ts` — novo
2. `src/components/dashboard/DashboardCustomizer.tsx` — novo
3. `src/pages/Dashboard.tsx` — editar header + condicionais

