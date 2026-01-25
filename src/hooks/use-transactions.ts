import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { calculateInstallments } from "@/lib/installment-utils";

type Transaction = Tables<"transactions">;
type TransactionInsert = TablesInsert<"transactions">;
type TransactionUpdate = TablesUpdate<"transactions">;
type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "pix" | "transfer" | "boleto" | "voucher";

const TRANSACTIONS_KEY = ["transactions"];
const ACCOUNTS_KEY = ["accounts"];
const INVOICES_KEY = ["invoices"];

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  limit?: number;
  offset?: number;
}

interface CreateTransactionParams extends Omit<TransactionInsert, "user_id"> {
  installments?: number;
}

/**
 * Hook para listar transações com filtros
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
          ),
          cards (
            id,
            name
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
      if (filters?.cardId) {
        query = query.eq("card_id", filters.cardId);
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
    staleTime: 1 * 60 * 1000, // 1 minuto
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
          accounts (id, name, type),
          cards (id, name)
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
 * Hook para criar transação (com suporte a parcelamento)
 * IMPORTANTE: O saldo das contas é atualizado via trigger no banco de dados.
 * NÃO atualizar manualmente aqui para evitar duplicidade.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ installments: numInstallments, ...transaction }: CreateTransactionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const isCreditCard = transaction.payment_method === "credit_card";
      const hasInstallments = isCreditCard && numInstallments && numInstallments > 1;

      // Buscar fatura antes de criar a transação (para vincular atomicamente)
      let invoiceId: string | null = null;
      
      if (isCreditCard && transaction.card_id) {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, status, total_amount")
          .eq("card_id", transaction.card_id)
          .eq("status", "open")
          .order("reference_month", { ascending: true })
          .limit(1)
          .single();

        if (invoice) {
          invoiceId = invoice.id;
        }
      }

      // 1. Criar transação principal (JÁ com invoice_id se for cartão)
      const { data: newTransaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          ...transaction,
          user_id: user.id,
          invoice_id: invoiceId, // Vincular atomicamente
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Se parcelado, criar grupo e parcelas
      if (hasInstallments && transaction.card_id) {
        const amounts = calculateInstallments(Number(transaction.amount), numInstallments);

        // Criar grupo de parcelamento
        const { data: group, error: groupError } = await supabase
          .from("installment_groups")
          .insert({
            user_id: user.id,
            transaction_id: newTransaction.id,
            total_amount: transaction.amount,
            total_installments: numInstallments,
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Buscar faturas disponíveis
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, reference_month, status, total_amount")
          .eq("card_id", transaction.card_id)
          .in("status", ["open", "closed"])
          .order("reference_month", { ascending: true })
          .limit(numInstallments + 1);

        // Encontrar primeira fatura aberta
        const openInvoices = invoices?.filter(inv => inv.status === "open") || [];
        let startIndex = 0;
        
        // Se primeira fatura não está aberta, começar da próxima
        if (invoices && invoices[0]?.status !== "open") {
          startIndex = openInvoices.length > 0 ? invoices.indexOf(openInvoices[0]) : 0;
        }

        // Criar parcelas
        const installmentsData = amounts.map((amount, index) => {
          const invoiceIndex = startIndex + index;
          const invoice = invoices?.[invoiceIndex];
          
          const dueDate = new Date(transaction.date || new Date());
          dueDate.setMonth(dueDate.getMonth() + index);

          return {
            group_id: group.id,
            installment_number: index + 1,
            amount,
            due_date: dueDate.toISOString().split('T')[0],
            invoice_id: invoice?.id || null,
            status: "pending" as const,
          };
        });

        const { error: installmentsError } = await supabase
          .from("installments")
          .insert(installmentsData);

        if (installmentsError) throw installmentsError;

        // NOTA: O trigger update_invoice_total_from_installments atualiza os totais das faturas
        // automaticamente ao inserir parcelas. Não precisamos fazer manualmente.
      }

      // NOTA: O trigger update_account_balance atualiza o saldo da conta
      // automaticamente ao inserir a transação. Não precisamos fazer manualmente.
      // NOTA: O trigger update_invoice_total atualiza o total da fatura
      // automaticamente ao inserir a transação. Não precisamos fazer manualmente.

      return newTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      
      const isExpense = data.type === "expense";
      const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(Number(data.amount));
      
      toast.success(
        isExpense 
          ? `Despesa de ${formattedAmount} registrada!`
          : `Receita de ${formattedAmount} registrada!`
      );
    },
    onError: (error) => {
      console.error("Erro ao criar transação:", error);
      toast.error("Erro ao criar transação. Tente novamente.");
    },
  });
}

/**
 * Hook para atualizar transação
 * IMPORTANTE: O saldo é recalculado via trigger. Não fazer manualmente.
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      toast.success("Transação atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar transação:", error);
      toast.error("Erro ao atualizar transação. Tente novamente.");
    },
  });
}

/**
 * Hook para soft delete de transação
 * IMPORTANTE: O saldo é revertido via trigger. Não fazer manualmente.
 * IMPORTANTE: O total da fatura é revertido via trigger. Não fazer manualmente.
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - o trigger cuida de reverter saldo e total da fatura
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
    },
    onError: (error) => {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir transação. Tente novamente.");
    },
  });
}

/**
 * Hook para restaurar transação
 * IMPORTANTE: O saldo é restaurado via trigger. Não fazer manualmente.
 */
export function useRestoreTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      toast.success("Transação restaurada!");
    },
  });
}
