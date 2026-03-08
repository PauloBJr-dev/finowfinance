import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/format";

export type BillStatus = "pending" | "paid" | "overdue";
type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export interface Bill {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category_id: string;
  due_date: string;
  status: BillStatus;
  recurrence_group_id: string | null;
  paid_at: string | null;
  paid_transaction_id: string | null;
  account_id: string | null;
  payment_method: PaymentMethod | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export interface BillFilters {
  month?: Date;
  status?: BillStatus | "all";
}

export interface CreateBillInput {
  description: string;
  amount: number;
  category_id: string;
  due_date: string;
  is_recurring?: boolean;
}

export interface PayBillInput {
  bill_id: string;
  payment_method: PaymentMethod;
  account_id: string;
  payment_date: string;
}

export function useBills(filters?: BillFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bills", user?.id, filters?.month?.toISOString(), filters?.status],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("bills")
        .select(`
          *,
          category:categories(id, name, icon, color)
        `)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("due_date", { ascending: true });

      if (filters?.month) {
        const startOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth(), 1);
        const endOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 0);
        
        query = query
          .gte("due_date", startOfMonth.toISOString().split("T")[0])
          .lte("due_date", endOfMonth.toISOString().split("T")[0]);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Bill[];
    },
    enabled: !!user?.id,
  });
}

export function useBillsSummary(month?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bills-summary", user?.id, month?.toISOString()],
    queryFn: async () => {
      if (!user?.id) return { pending: 0, overdue: 0, paid: 0, total: 0 };

      let query = supabase
        .from("bills")
        .select("status, amount")
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (month) {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        
        query = query
          .gte("due_date", startOfMonth.toISOString().split("T")[0])
          .lte("due_date", endOfMonth.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = {
        pending: 0,
        overdue: 0,
        paid: 0,
        total: 0,
      };

      data?.forEach((bill) => {
        summary.total += Number(bill.amount);
        if (bill.status === "pending") summary.pending += Number(bill.amount);
        if (bill.status === "overdue") summary.overdue += Number(bill.amount);
        if (bill.status === "paid") summary.paid += Number(bill.amount);
      });

      return summary;
    },
    enabled: !!user?.id,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBillInput) => {
      const { data, error } = await supabase.functions.invoke('bills', {
        method: 'POST',
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-summary"] });
      
      const count = variables.is_recurring ? 6 : 1;
      toast.success(
        variables.is_recurring 
          ? `${count} contas a pagar criadas!` 
          : "Conta a pagar criada!",
        {
          description: variables.is_recurring
            ? `"${variables.description}" será cobrada pelos próximos 6 meses.`
            : `"${variables.description}" adicionada às suas contas.`,
        }
      );
    },
    onError: (error) => {
      console.error("Erro ao criar conta a pagar:", error);
      toast.error("Erro ao criar conta", {
        description: error instanceof Error ? error.message : "Não foi possível criar a conta a pagar. Tente novamente.",
      });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PayBillInput) => {
      const { data, error } = await supabase.functions.invoke('bills/pay', {
        method: 'POST',
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { bill: Bill; transaction: unknown };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      
      toast.success("Conta paga!", {
        description: `Despesa de ${formatCurrency(Number(data.bill.amount))} registrada.`,
      });
    },
    onError: (error) => {
      console.error("Erro ao pagar conta:", error);
      toast.error("Erro ao pagar conta", {
        description: error instanceof Error ? error.message : "Não foi possível registrar o pagamento. Tente novamente.",
      });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      const { data, error } = await supabase.functions.invoke(`bills/${billId}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-summary"] });
    },
    onError: (error) => {
      console.error("Erro ao remover conta:", error);
      toast.error("Erro ao remover", {
        description: "Não foi possível remover a conta. Tente novamente.",
      });
    },
  });
}

export function useRestoreBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      const { data, error } = await supabase.functions.invoke(`bills/${billId}`, {
        method: 'PATCH',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-summary"] });
      
      toast.success("Conta restaurada", {
        description: "A conta a pagar foi restaurada.",
      });
    },
  });
}
