import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

type Transaction = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;
type TransactionType = "expense" | "income";

const TRANSACTIONS_KEY = ["transactions"];
const ACCOUNTS_KEY = ["accounts"];

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  limit?: number;
  offset?: number;
}

interface CreateTransactionParams {
  amount: number;
  type: TransactionType;
  payment_method: string;
  date?: string;
  description?: string;
  category_id?: string;
  account_id?: string;
  tags?: string[];
}

/**
 * Hook para listar transações com filtros (read-only, direct query is fine)
 */
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          ),
          accounts (
            id,
            name,
            type
          )
        `)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("date", filters.endDate);
      }
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters?.accountId) {
        query = query.eq("account_id", filters.accountId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para transações do mês atual
 */
export function useMonthlyTransactions() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return useTransactions({ startDate, endDate });
}

/**
 * Hook para buscar uma transação específica
 */
export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (id, name, icon, color),
          accounts (id, name, type)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Hook para criar transação via Edge Function (server-side validation)
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: CreateTransactionParams) => {
      const { data, error } = await supabase.functions.invoke('transactions', {
        method: 'POST',
        body: transaction,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onMutate: async (newTransaction) => {
      await queryClient.cancelQueries({ queryKey: ACCOUNTS_KEY });
      const previousAccounts = queryClient.getQueryData(ACCOUNTS_KEY);

      if (newTransaction.account_id) {
        queryClient.setQueryData(ACCOUNTS_KEY, (old: any[] | undefined) => {
          if (!old) return old;
          return old.map((account) => {
            if (account.id === newTransaction.account_id) {
              const delta = newTransaction.type === "expense"
                ? -Number(newTransaction.amount)
                : Number(newTransaction.amount);
              return {
                ...account,
                current_balance: Number(account.current_balance) + delta,
              };
            }
            return account;
          });
        });
      }

      return { previousAccounts };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      
      // Fire-and-forget: trigger anomaly detection (non-blocking)
      if (data?.id) {
        supabase.functions.invoke('ai-anomaly', { body: { transaction_id: data.id } })
          .catch((err) => console.warn('[anomaly] fire-and-forget failed:', err));
      }

      const isExpense = data.type === "expense";
      const formattedAmount = formatCurrency(Number(data.amount));
      
      toast.success(
        isExpense 
          ? `Despesa de ${formattedAmount} registrada!`
          : `Receita de ${formattedAmount} registrada!`
      );
    },
    onError: (error, _variables, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(ACCOUNTS_KEY, context.previousAccounts);
      }
      console.error("[useCreateTransaction] Erro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar transação. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

/**
 * Hook para atualizar transação via Supabase client (direto, sem Edge Function)
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const finalUpdates: Record<string, unknown> = { ...updates };

      // Se mudou para cartão de crédito, recalcular invoice_id
      if (updates.payment_method === 'credit_card' && updates.card_id && updates.date) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: invoiceId, error: invoiceError } = await supabase.rpc('find_or_create_invoice', {
          p_card_id: updates.card_id,
          p_user_id: user.id,
          p_transaction_date: updates.date,
        });

        if (invoiceError) throw new Error('Erro ao calcular fatura');
        finalUpdates.invoice_id = invoiceId;
        finalUpdates.account_id = null;
      }

      // Se mudou para outro método, limpar invoice e card
      if (updates.payment_method !== undefined && updates.payment_method !== 'credit_card') {
        finalUpdates.invoice_id = null;
        finalUpdates.card_id = null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(finalUpdates)
        .eq('id', id)
        .select('*, categories(*), accounts(*), cards(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Transação atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar transação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar transação. Tente novamente.");
    },
  });
}

/**
 * Hook para soft delete de transação via Edge Function
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`transactions/${id}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
    onError: (error) => {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir transação. Tente novamente.");
    },
  });
}

/**
 * Hook para restaurar transação via Edge Function
 */
export function useRestoreTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`transactions/${id}`, {
        method: 'PATCH',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      toast.success("Transação restaurada!");
    },
  });
}
