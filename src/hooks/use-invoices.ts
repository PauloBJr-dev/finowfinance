import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export type InvoiceStatus = 'open' | 'closed' | 'paid';

export interface Invoice {
  id: string;
  card_id: string;
  user_id: string;
  status: InvoiceStatus;
  cycle_start_date: string;
  cycle_end_date: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  paid_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

const INVOICES_KEY = ['invoices'];

/**
 * Busca ou cria a fatura de um mês específico para um cartão.
 * Usa a função SQL get_or_create_monthly_invoice do banco.
 * NUNCA use find_or_create_invoice (função antiga com bug).
 */
export async function getOrCreateInvoice(
  cardId: string,
  userId: string,
  targetMonth: Date
): Promise<string> {
  const targetMonthStr = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    1
  ).toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('get_or_create_monthly_invoice', {
    p_card_id: cardId,
    p_user_id: userId,
    p_target_month: targetMonthStr,
  });

  if (error) throw new Error(`Erro ao buscar fatura: ${error.message}`);
  if (!data) throw new Error('Fatura não encontrada');

  return data as string;
}

export function useInvoices(cardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...INVOICES_KEY, cardId, user?.id],
    queryFn: async () => {
      if (!cardId || !user?.id) return [];

      // Buscar billing_day do cartão para calcular o mês correto
      const { data: cardData } = await supabase
        .from('cards')
        .select('billing_day')
        .eq('id', cardId)
        .single();

      if (cardData) {
        const { getTargetInvoiceMonth } = await import('@/lib/invoice-cycle');
        const targetMonth = getTargetInvoiceMonth(cardData.billing_day, new Date());
        await getOrCreateInvoice(cardId, user.id, targetMonth);
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('card_id', cardId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('closing_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!cardId && !!user?.id,
  });
}

export function useInvoiceTransactions(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice-transactions', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(id, name, icon, color)')
        .eq('invoice_id', invoiceId)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      invoice,
      accountId,
      paymentDate,
      cardName,
    }: {
      invoice: Invoice;
      accountId: string;
      paymentDate: string;
      cardName: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (invoice.status === 'paid') throw new Error('Fatura já foi paga');
      if (invoice.total_amount <= 0) throw new Error('Fatura sem valor a pagar');

      const monthLabel = new Intl.DateTimeFormat('pt-BR', {
        month: 'long', year: 'numeric'
      }).format(new Date(invoice.closing_date));

      // 1. Criar transação de despesa
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: invoice.total_amount,
          type: 'expense' as const,
          payment_method: 'transfer' as const,
          account_id: accountId,
          description: `Pagamento fatura ${cardName} - ${monthLabel}`,
          date: paymentDate,
        });

      if (txError) throw txError;

      // 2. Marcar fatura como paga
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid' as const, paid_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;
    },
    onSuccess: (_, { invoice, cardName }) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bills-summary'] });

      const amount = new Intl.NumberFormat('pt-BR', {
        style: 'currency', currency: 'BRL'
      }).format(invoice.total_amount);

      toast.success(`Fatura paga! ${amount} debitados.`, {
        description: `Fatura do ${cardName} quitada com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao pagar fatura', { description: error.message });
    },
  });
}
