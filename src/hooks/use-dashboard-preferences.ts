import { useState, useCallback } from "react";

const STORAGE_KEY = "finow_dashboard_prefs";

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  micro_insight: true,
  kpi_balance: true,
  kpi_expenses: true,
  kpi_income: true,
  kpi_net: true,
  kpi_benefit: true,
  month_flow: true,
  reminders: true,
  ai_insights: true,
  current_invoices: true,
  expenses_chart: true,
  upcoming_bills: true,
  recent_transactions: true,
};

export const DEFAULT_KPI_ORDER = [
  "kpi_balance",
  "kpi_expenses",
  "kpi_income",
  "kpi_net",
  "kpi_benefit",
];

export const DEFAULT_SECTION_ORDER = [
  "micro_insight",
  "month_flow",
  "reminders",
  "ai_insights",
  "current_invoices",
  "expenses_chart",
  "upcoming_bills",
  "recent_transactions",
];

interface DashboardPrefs {
  visibility: Record<string, boolean>;
  kpiOrder: string[];
  sectionOrder: string[];
}

function loadPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Support legacy format (flat visibility object)
      if (!parsed.visibility) {
        return {
          visibility: { ...DEFAULT_VISIBILITY, ...parsed },
          kpiOrder: [...DEFAULT_KPI_ORDER],
          sectionOrder: [...DEFAULT_SECTION_ORDER],
        };
      }
      return {
        visibility: { ...DEFAULT_VISIBILITY, ...parsed.visibility },
        kpiOrder: parsed.kpiOrder?.length ? parsed.kpiOrder : [...DEFAULT_KPI_ORDER],
        sectionOrder: parsed.sectionOrder?.length ? parsed.sectionOrder : [...DEFAULT_SECTION_ORDER],
      };
    }
  } catch {}
  return {
    visibility: { ...DEFAULT_VISIBILITY },
    kpiOrder: [...DEFAULT_KPI_ORDER],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

function savePrefs(prefs: DashboardPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function reorder(list: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function useDashboardPreferences() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(loadPrefs);

  const toggleWidget = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = { ...prev, visibility: { ...prev.visibility, [id]: !prev.visibility[id] } };
      savePrefs(next);
      return next;
    });
  }, []);

  const reorderKpis = useCallback((fromIndex: number, toIndex: number) => {
    setPrefs((prev) => {
      const next = { ...prev, kpiOrder: reorder(prev.kpiOrder, fromIndex, toIndex) };
      savePrefs(next);
      return next;
    });
  }, []);

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    setPrefs((prev) => {
      const next = { ...prev, sectionOrder: reorder(prev.sectionOrder, fromIndex, toIndex) };
      savePrefs(next);
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPrefs({
      visibility: { ...DEFAULT_VISIBILITY },
      kpiOrder: [...DEFAULT_KPI_ORDER],
      sectionOrder: [...DEFAULT_SECTION_ORDER],
    });
  }, []);

  return {
    visibleWidgets: prefs.visibility,
    kpiOrder: prefs.kpiOrder,
    sectionOrder: prefs.sectionOrder,
    toggleWidget,
    reorderKpis,
    reorderSections,
    resetDefaults,
  };
}

export const WIDGET_LABELS: Record<string, string> = {
  micro_insight: "Micro Insight",
  kpi_balance: "Saldo Total",
  kpi_expenses: "Despesas",
  kpi_income: "Receitas",
  kpi_net: "Balanço do Mês",
  kpi_benefit: "Vale Refeição",
  month_flow: "Fluxo do Mês",
  reminders: "Lembretes",
  ai_insights: "Insights de IA",
  current_invoices: "Faturas Atuais",
  expenses_chart: "Despesas por Categoria",
  upcoming_bills: "Próximos Vencimentos",
  recent_transactions: "Atividade Recente",
};
