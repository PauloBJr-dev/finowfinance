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
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ installments: numInstallments, ...transaction }: CreateTransactionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const isCreditCard = transaction.payment_method === "credit_card";
      const hasInstallments = isCreditCard && numInstallments && numInstallments > 1;

      // 1. Criar transação principal
      const { data: newTransaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          ...transaction,
          user_id: user.id,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Se cartão de crédito, encontrar/atualizar fatura
      if (isCreditCard && transaction.card_id) {
        // Buscar fatura aberta do cartão
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, status, total_amount")
          .eq("card_id", transaction.card_id)
          .eq("status", "open")
          .order("reference_month", { ascending: true })
          .limit(1)
          .single();

        if (invoice) {
          // Atualizar invoice_id da transação
          await supabase
            .from("transactions")
            .update({ invoice_id: invoice.id })
            .eq("id", newTransaction.id);

          // Atualizar total da fatura (apenas se não parcelado)
          if (!hasInstallments) {
            await supabase
              .from("invoices")
              .update({ 
                total_amount: Number(invoice.total_amount) + Number(transaction.amount) 
              })
              .eq("id", invoice.id);
          }
        }
      }

      // 3. Se parcelado, criar grupo e parcelas
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

        // Atualizar totais das faturas
        for (const installment of installmentsData) {
          if (installment.invoice_id) {
            const invoice = invoices?.find(inv => inv.id === installment.invoice_id);
            if (invoice) {
              await supabase
                .from("invoices")
                .update({
                  total_amount: Number(invoice.total_amount) + installment.amount
                })
                .eq("id", invoice.id);
            }
          }
        }
      }

      // 4. Se pagamento em conta (não cartão), atualizar saldo
      if (!isCreditCard && transaction.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("current_balance")
          .eq("id", transaction.account_id)
          .single();

        if (account) {
          const currentBalance = Number(account.current_balance);
          const amount = Number(transaction.amount);
          const newBalance = transaction.type === "income"
            ? currentBalance + amount
            : currentBalance - amount;

          await supabase
            .from("accounts")
            .update({ current_balance: newBalance })
            .eq("id", transaction.account_id);
        }
      }

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
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar transação para reverter saldo se necessário
      const { data: transaction } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (transaction) {
        // Soft delete
        const { error } = await supabase
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (error) throw error;

        // Reverter saldo se era pagamento em conta
        if (transaction.account_id && transaction.payment_method !== "credit_card") {
          const { data: account } = await supabase
            .from("accounts")
            .select("current_balance")
            .eq("id", transaction.account_id)
            .single();

          if (account) {
            const currentBalance = Number(account.current_balance);
            const amount = Number(transaction.amount);
            const newBalance = transaction.type === "income"
              ? currentBalance - amount
              : currentBalance + amount;

            await supabase
              .from("accounts")
              .update({ current_balance: newBalance })
              .eq("id", transaction.account_id);
          }
        }

        // Atualizar total da fatura se era cartão
        if (transaction.invoice_id) {
          const { data: invoice } = await supabase
            .from("invoices")
            .select("total_amount")
            .eq("id", transaction.invoice_id)
            .single();

          if (invoice) {
            await supabase
              .from("invoices")
              .update({
                total_amount: Math.max(0, Number(invoice.total_amount) - Number(transaction.amount))
              })
              .eq("id", transaction.invoice_id);
          }
        }
      }

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
