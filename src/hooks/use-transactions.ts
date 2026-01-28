import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { calculateInstallments } from "@/lib/installment-utils";
import { formatCurrency } from "@/lib/format";

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
      const transactionDate = transaction.date || new Date().toISOString().split('T')[0];

      console.log("[useCreateTransaction] Iniciando criação:", {
        isCreditCard,
        hasInstallments,
        cardId: transaction.card_id,
        transactionDate,
        amount: transaction.amount,
      });

      // Para cartão de crédito, SEMPRE precisamos de uma fatura
      let invoiceId: string | null = null;
      
      if (isCreditCard && transaction.card_id) {
        // Compras à vista: vincular transação à fatura
        // Compras parceladas: NÃO vincular transação principal (parcelas vinculam)
        if (!hasInstallments) {
          console.log("[useCreateTransaction] Buscando fatura para compra à vista...");
          
          const { data: foundInvoiceId, error: invoiceError } = await supabase.rpc('find_or_create_invoice', {
            p_card_id: transaction.card_id,
            p_user_id: user.id,
            p_transaction_date: transactionDate,
            p_is_future_installment: false
          });

          if (invoiceError) {
            console.error("[useCreateTransaction] ERRO ao buscar/criar fatura:", invoiceError);
            throw new Error(`Não foi possível encontrar ou criar a fatura: ${invoiceError.message}`);
          }
          
          if (!foundInvoiceId) {
            console.error("[useCreateTransaction] RPC retornou nulo para fatura");
            throw new Error("Não foi possível criar a fatura para este cartão. Verifique as configurações do cartão.");
          }

          invoiceId = foundInvoiceId;
          console.log("[useCreateTransaction] Fatura encontrada/criada:", invoiceId);
        }
      }

      // 1. Criar transação principal
      console.log("[useCreateTransaction] Criando transação principal com invoice_id:", invoiceId);
      
      const { data: newTransaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          ...transaction,
          user_id: user.id,
          invoice_id: invoiceId, // null para parceladas, preenchido para à vista
        })
        .select()
        .single();

      if (txError) {
        console.error("[useCreateTransaction] Erro ao criar transação:", txError);
        throw txError;
      }

      console.log("[useCreateTransaction] Transação criada:", newTransaction.id);

      // 2. Se parcelado, criar grupo e parcelas
      if (hasInstallments && transaction.card_id) {
        console.log(`[useCreateTransaction] Criando ${numInstallments} parcelas...`);
        
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

        if (groupError) {
          console.error("[useCreateTransaction] Erro ao criar grupo:", groupError);
          throw groupError;
        }

        console.log("[useCreateTransaction] Grupo criado:", group.id);

        // Buscar/criar faturas para cada parcela
        const transactionDateObj = new Date(transactionDate);
        const installmentsData = [];

        for (let index = 0; index < numInstallments; index++) {
          const parcela = amounts[index];
          
          // Calcular data da parcela (incrementando mês a mês)
          const parcelaDate = new Date(transactionDateObj);
          parcelaDate.setMonth(parcelaDate.getMonth() + index);
          const parcelaDateStr = parcelaDate.toISOString().split('T')[0];

          console.log(`[useCreateTransaction] Parcela ${index + 1}: buscando fatura para ${parcelaDateStr}`);

          // Buscar/criar fatura para esta parcela (p_is_future_installment = true)
          const { data: parcelaInvoiceId, error: invoiceError } = await supabase.rpc('find_or_create_invoice', {
            p_card_id: transaction.card_id,
            p_user_id: user.id,
            p_transaction_date: parcelaDateStr,
            p_is_future_installment: true
          });

          if (invoiceError) {
            console.error(`[useCreateTransaction] ERRO ao buscar fatura para parcela ${index + 1}:`, invoiceError);
            throw new Error(`Não foi possível criar fatura para parcela ${index + 1}: ${invoiceError.message}`);
          }

          if (!parcelaInvoiceId) {
            console.error(`[useCreateTransaction] RPC retornou nulo para parcela ${index + 1}`);
            throw new Error(`Não foi possível criar fatura para parcela ${index + 1}`);
          }

          console.log(`[useCreateTransaction] Parcela ${index + 1}: fatura ${parcelaInvoiceId}`);

          installmentsData.push({
            group_id: group.id,
            installment_number: index + 1,
            amount: parcela,
            due_date: parcelaDateStr,
            invoice_id: parcelaInvoiceId,
            status: "pending" as const,
          });
        }

        const { error: installmentsError } = await supabase
          .from("installments")
          .insert(installmentsData);

        if (installmentsError) {
          console.error("[useCreateTransaction] Erro ao criar parcelas:", installmentsError);
          throw installmentsError;
        }

        console.log(`[useCreateTransaction] ${numInstallments} parcelas criadas com sucesso`);
      }

      return newTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      
      const isExpense = data.type === "expense";
      const formattedAmount = formatCurrency(Number(data.amount));
      
      toast.success(
        isExpense 
          ? `Despesa de ${formattedAmount} registrada!`
          : `Receita de ${formattedAmount} registrada!`
      );
    },
    onError: (error) => {
      console.error("[useCreateTransaction] Erro final:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar transação. Tente novamente.");
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
