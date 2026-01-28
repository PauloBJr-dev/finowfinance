import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatMonth } from "@/lib/format";

type Invoice = Tables<"invoices">;
type InvoiceStatus = "open" | "closed" | "paid";

const INVOICES_KEY = ["invoices"];
const ACCOUNTS_KEY = ["accounts"];
const TRANSACTIONS_KEY = ["transactions"];

interface InvoiceFilters {
  cardId?: string;
  status?: InvoiceStatus;
}

interface AvailableInvoice {
  invoice_id: string;
  month_label: string;
  closing_date: string;
  due_date: string;
  status: string;
  total_amount: number;
}

/**
 * Hook para listar faturas
 * Usa closing_date para ordenação (novo schema com ciclo bancário)
 */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [...INVOICES_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          cards!inner (
            id,
            name,
            credit_limit,
            deleted_at
          )
        `)
        .is("deleted_at", null) // Filtrar faturas não excluídas
        .order("closing_date", { ascending: false });

      if (filters?.cardId) {
        query = query.eq("card_id", filters.cardId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      // Filtrar apenas cartões não excluídos
      query = query.is("cards.deleted_at", null);

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
 * Usa closing_date para ordenação (ciclo bancário)
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
        .order("closing_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data as Invoice | null;
    },
    enabled: !!cardId,
  });
}

/**
 * Hook para buscar faturas disponíveis para seleção (não pagas)
 * Usa a nova RPC get_available_invoices que cria faturas automaticamente
 */
export function useAvailableInvoices(cardId: string | null) {
  return useQuery({
    queryKey: [...INVOICES_KEY, "available", cardId],
    queryFn: async () => {
      if (!cardId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc('get_available_invoices', {
        p_card_id: cardId,
        p_user_id: user.id,
        p_months_ahead: 6
      });

      if (error) {
        console.error("[useAvailableInvoices] Erro:", error);
        throw error;
      }

      return (data || []) as AvailableInvoice[];
    },
    enabled: !!cardId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para buscar/criar fatura de um mês específico
 * Usa a nova RPC get_or_create_monthly_invoice
 */
export function useGetOrCreateMonthlyInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      targetMonth 
    }: { 
      cardId: string; 
      targetMonth: Date;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Normalizar para primeiro dia do mês
      const firstDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      
      const { data: invoiceId, error } = await supabase.rpc('get_or_create_monthly_invoice', {
        p_card_id: cardId,
        p_user_id: user.id,
        p_target_month: firstDayOfMonth.toISOString().split('T')[0]
      });

      if (error) {
        console.error("[useGetOrCreateMonthlyInvoice] Erro:", error);
        throw error;
      }

      return invoiceId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
    },
  });
}

/**
 * Hook para alterar status da fatura manualmente
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      newStatus 
    }: { 
      invoiceId: string; 
      newStatus: InvoiceStatus;
    }) => {
      const { error } = await supabase.rpc('update_invoice_status', {
        p_invoice_id: invoiceId,
        p_new_status: newStatus
      });

      if (error) {
        console.error("[useUpdateInvoiceStatus] Erro:", error);
        throw error;
      }

      return { invoiceId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      
      const statusLabels = {
        open: 'aberta',
        closed: 'fechada',
        paid: 'paga'
      };
      
      toast.success(`Fatura marcada como ${statusLabels[newStatus]}!`);
    },
    onError: (error) => {
      console.error("Erro ao alterar status:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao alterar status da fatura");
    },
  });
}

/**
 * Hook para pagar fatura integralmente
 * REGRA: Só pode pagar fatura com status = 'closed'
 * IMPORTANTE: O saldo da conta é atualizado via trigger quando a transação é criada.
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
      
      // Validação: só pode pagar fatura fechada
      if (invoice.status === "paid") {
        throw new Error("Esta fatura já foi paga");
      }
      
      if (invoice.status === "open") {
        throw new Error("Esta fatura ainda está aberta. Feche a fatura antes de pagar.");
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
      
      // Formatar mês a partir do closing_date
      const month = formatMonth(invoice.closing_date);
      toast.success(`Fatura de ${month} paga com sucesso!`);
    },
    onError: (error) => {
      console.error("Erro ao pagar fatura:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao pagar fatura");
    },
  });
}
