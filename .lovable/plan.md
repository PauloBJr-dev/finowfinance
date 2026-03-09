

# Duas alteracoes pontuais

## 1. DashboardCustomizer — drag-and-drop no mobile

Atualmente no mobile o componente usa botoes ChevronUp/ChevronDown em vez de drag. A mudanca e simples: remover a condicao `isMobile` que diferencia o comportamento. Todos os itens passam a ser `draggable` com `GripVertical` independente do dispositivo. Remover os botoes ChevronUp/ChevronDown e a prop `isMobile` do `DraggableList`.

**Arquivo:** `src/components/dashboard/DashboardCustomizer.tsx`
- Remover import de `ChevronUp`, `ChevronDown`, `useIsMobile`
- Remover prop `isMobile` do `DraggableList`
- Tornar todos os itens `draggable` sempre, com `GripVertical` sempre visivel
- Remover bloco condicional dos botoes up/down

## 2. PeriodFilter — remover filtros desnecessarios

Remover "Hoje", "Ontem", "7 dias", "15 dias" do array `PERIOD_OPTIONS`, mantendo apenas "Mes passado", "Mes atual" e "Personalizado". Atualizar o type `PeriodKey` para refletir.

**Arquivo:** `src/components/shared/PeriodFilter.tsx`
- `PeriodKey` = `"last_month" | "this_month" | "custom"`
- `PERIOD_OPTIONS` com apenas 2 entradas (last_month, this_month)
- Remover imports nao usados (`subDays`, `startOfDay`, `endOfDay`)

