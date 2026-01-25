import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Invoice = Tables<"invoices">;
type InvoiceStatus = "open" | "closed" | "paid";

const INVOICES_KEY = ["invoices"];
const ACCOUNTS_KEY = ["accounts"];
const TRANSACTIONS_KEY = ["transactions"];

interface InvoiceFilters {
  cardId?: string;
  status?: InvoiceStatus;
}

/**
 * Hook para listar faturas
 */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [...INVOICES_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          cards (
            id,
            name,
            credit_limit
          )
        `)
        .order("reference_month", { ascending: false });

      if (filters?.cardId) {
        query = query.eq("card_id", filters.cardId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar uma fatura específica com transações
 */
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: [...INVOICES_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          cards (
            id,
            name,
            credit_limit,
            billing_day,
            due_day
          )
        `)
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      // Buscar transações da fatura
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq("invoice_id", id)
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (txError) throw txError;

      // Buscar parcelas da fatura
      const { data: installments, error: instError } = await supabase
        .from("installments")
        .select(`
          *,
          installment_groups (
            id,
            total_amount,
            total_installments,
            transactions (
              id,
              description,
              categories (
                id,
                name,
                icon,
                color
              )
            )
          )
        `)
        .eq("invoice_id", id)
        .order("installment_number", { ascending: true });

      if (instError) throw instError;

      return {
        ...invoice,
        transactions,
        installments,
      };
    },
    enabled: !!id,
  });
}

/**
 * Hook para buscar fatura atual (aberta) de um cartão
 */
export function useCurrentInvoice(cardId: string | null) {
  return useQuery({
    queryKey: [...INVOICES_KEY, "current", cardId],
    queryFn: async () => {
      if (!cardId) return null;

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("card_id", cardId)
        .eq("status", "open")
        .order("reference_month", { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Nenhuma fatura encontrada
          return null;
        }
        throw error;
      }

      return data as Invoice;
    },
    enabled: !!cardId,
  });
}

/**
 * Hook para pagar fatura integralmente
 * IMPORTANTE: O saldo da conta é atualizado via trigger quando a transação é criada.
 * NÃO atualizar manualmente aqui para evitar duplicidade.
 */
export function usePayInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      accountId 
    }: { 
      invoiceId: string; 
      accountId: string;
    }) => {
      // 1. Buscar dados da fatura
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, cards(name)")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (invoice.status === "paid") {
        throw new Error("Esta fatura já foi paga");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 2. Marcar fatura como paga
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_from_account_id: accountId,
        })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      // 3. Criar transação de débito na conta
      // NOTA: O trigger update_account_balance irá deduzir do saldo automaticamente
      const cardName = (invoice.cards as { name: string })?.name || "Cartão";
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: accountId,
          amount: invoice.total_amount,
          type: "expense",
          payment_method: "transfer",
          description: `Pagamento fatura ${cardName}`,
          date: new Date().toISOString().split('T')[0],
        });

      if (txError) throw txError;

      // NOTA: NÃO atualizar saldo manualmente - o trigger cuida disso

      // 4. Marcar parcelas como reconciled
      const { error: installmentsError } = await supabase
        .from("installments")
        .update({ status: "reconciled" })
        .eq("invoice_id", invoiceId);

      if (installmentsError) {
        console.error("Erro ao reconciliar parcelas:", installmentsError);
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      
      const month = new Date(invoice.reference_month).toLocaleDateString('pt-BR', { 
        month: 'long' 
      });
      toast.success(`Fatura de ${month} paga com sucesso!`);
    },
    onError: (error) => {
      console.error("Erro ao pagar fatura:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao pagar fatura");
    },
  });
}
