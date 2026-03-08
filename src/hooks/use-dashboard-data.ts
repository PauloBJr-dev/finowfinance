import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Busca transações dos últimos 6 meses para gráficos do dashboard
 */
export function useSixMonthTransactions() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  return useQuery({
    queryKey: ["dashboard-6months", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, amount, type, date,
          categories (id, name, icon, color)
        `)
        .is("deleted_at", null)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Busca as próximas 3 contas a pagar (pendentes/vencidas)
 */
export function useUpcomingBills() {
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dashboard-upcoming-bills", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select(`
          id, description, amount, due_date, status,
          category:categories(id, name, icon, color)
        `)
        .is("deleted_at", null)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
