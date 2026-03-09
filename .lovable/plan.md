

# Reordenação de Widgets no Dashboard

## Contexto
Atualmente o dashboard tem visibilidade configurável via toggles, mas a ordem dos widgets é fixa no código. O usuário quer arrastar/reordenar widgets no painel de personalização.

## Abordagem

Usar **drag-and-drop nativo com HTML5** (sem biblioteca externa) no painel `DashboardCustomizer`. Cada item da lista terá um handle de arrasto (ícone `GripVertical`). A ordem será persistida em `localStorage` junto com a visibilidade.

### Categorias de widgets

Os widgets se dividem em dois grupos com comportamentos de layout distintos:

1. **KPIs** (`kpi_balance`, `kpi_expenses`, `kpi_income`, `kpi_net`, `kpi_benefit`) — renderizados dentro de uma grid horizontal responsiva
2. **Seções** (`micro_insight`, `month_flow`, `reminders`, `ai_insights`, `current_invoices`, `expenses_chart`, `upcoming_bills`, `recent_transactions`) — renderizados como blocos verticais full-width

No customizer, as duas listas serão separadas visualmente ("Indicadores" e "Seções") e cada uma reordenável independentemente. Isso evita que o usuário coloque um KPI card no meio de seções full-width.

### Arquivos modificados

1. **`src/hooks/use-dashboard-preferences.ts`**
   - Adicionar estado `widgetOrder` (dois arrays: `kpiOrder` e `sectionOrder`)
   - Novo `STORAGE_KEY` para ordem (ou unificar no mesmo JSON)
   - Funções `reorderKpis(fromIndex, toIndex)` e `reorderSections(fromIndex, toIndex)`
   - `resetDefaults` reseta ambos

2. **`src/components/dashboard/DashboardCustomizer.tsx`**
   - Separar lista em duas seções: "Indicadores" e "Seções"
   - Cada item ganha `draggable`, `onDragStart`, `onDragOver`, `onDrop`
   - Ícone `GripVertical` como handle visual
   - Descrição atualizada: "Escolha e reordene os widgets."

3. **`src/pages/Dashboard.tsx`**
   - Importar `kpiOrder` e `sectionOrder` do hook
   - KPIs: iterar `kpiOrder` com um map que renderiza o card correto
   - Seções: iterar `sectionOrder` com um map que renderiza o componente correto
   - `expenses_chart` e `upcoming_bills` continuam agrupados lado a lado quando ambos visíveis e adjacentes na ordem; caso contrário, renderizam full-width

### Layout inteligente

- KPIs: grid responsiva `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` (sem mudança)
- Seções: renderizadas em sequência vertical. Quando `expenses_chart` e `upcoming_bills` estão adjacentes na ordem, agrupam-se em `grid md:grid-cols-2`. Se separados por outro widget, renderizam individualmente em full-width.

### Sem dependência externa
Drag-and-drop via `draggable` HTML5 nativo — leve, sem pacote adicional. Funciona em desktop e mobile (com `touch` fallback via botões up/down no mobile para acessibilidade).

