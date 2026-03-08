import { useState, useCallback } from "react";

const STORAGE_KEY = "finow_dashboard_prefs";

const DEFAULT_PREFS: Record<string, boolean> = {
  micro_insight: true,
  kpi_balance: true,
  kpi_expenses: true,
  kpi_income: true,
  kpi_net: true,
  kpi_benefit: true,
  month_flow: true,
  reminders: true,
  ai_insights: true,
  expenses_chart: true,
  upcoming_bills: true,
  recent_transactions: true,
};

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

export function useDashboardPreferences() {
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(loadPrefs);

  const toggleWidget = useCallback((id: string) => {
    setVisibleWidgets((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setVisibleWidgets({ ...DEFAULT_PREFS });
  }, []);

  return { visibleWidgets, toggleWidget, resetDefaults };
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
  expenses_chart: "Despesas por Categoria",
  upcoming_bills: "Próximos Vencimentos",
  recent_transactions: "Atividade Recente",
};
