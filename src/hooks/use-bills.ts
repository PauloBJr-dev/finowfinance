import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { addMonths } from "date-fns";
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

      // Filtro por mês
      if (filters?.month) {
        const startOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth(), 1);
        const endOfMonth = new Date(filters.month.getFullYear(), filters.month.getMonth() + 1, 0);
        
        query = query
          .gte("due_date", startOfMonth.toISOString().split("T")[0])
          .lte("due_date", endOfMonth.toISOString().split("T")[0]);
      }

      // Filtro por status
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBillInput) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const billsToCreate: Array<{
        user_id: string;
        description: string;
        amount: number;
        category_id: string;
        due_date: string;
        status: BillStatus;
        recurrence_group_id: string | null;
      }> = [];

      const recurrenceGroupId = input.is_recurring ? crypto.randomUUID() : null;
      const baseDate = new Date(input.due_date);

      if (input.is_recurring) {
        // Criar 6 contas (mês atual + 5 próximos)
        for (let i = 0; i < 6; i++) {
          const dueDate = addMonths(baseDate, i);
          billsToCreate.push({
            user_id: user.id,
            description: input.description,
            amount: input.amount,
            category_id: input.category_id,
            due_date: dueDate.toISOString().split("T")[0],
            status: "pending",
            recurrence_group_id: recurrenceGroupId,
          });
        }
      } else {
        billsToCreate.push({
          user_id: user.id,
          description: input.description,
          amount: input.amount,
          category_id: input.category_id,
          due_date: input.due_date,
          status: "pending",
          recurrence_group_id: null,
        });
      }

      const { data, error } = await supabase
        .from("bills")
        .insert(billsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
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
        description: "Não foi possível criar a conta a pagar. Tente novamente.",
      });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PayBillInput) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Buscar dados da bill
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .select("*")
        .eq("id", input.bill_id)
        .single();

      if (billError || !bill) throw new Error("Conta não encontrada");

      // Criar transação de despesa
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: bill.amount,
          type: "expense" as const,
          payment_method: input.payment_method,
          account_id: input.account_id,
          category_id: bill.category_id,
          description: bill.description,
          date: input.payment_date,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Atualizar bill como paga
      const { error: updateError } = await supabase
        .from("bills")
        .update({
          status: "paid" as BillStatus,
          paid_at: new Date().toISOString(),
          paid_transaction_id: transaction.id,
          account_id: input.account_id,
          payment_method: input.payment_method,
        })
        .eq("id", input.bill_id);

      if (updateError) throw updateError;

      return { bill, transaction };
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
        description: "Não foi possível registrar o pagamento. Tente novamente.",
      });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase
        .from("bills")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", billId);

      if (error) throw error;
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
      const { error } = await supabase
        .from("bills")
        .update({ deleted_at: null })
        .eq("id", billId);

      if (error) throw error;
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
