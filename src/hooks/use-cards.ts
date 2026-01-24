import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { generateInvoicePeriods } from "@/lib/invoice-utils";

type Card = Tables<"cards">;
type CardInsert = TablesInsert<"cards">;
type CardUpdate = TablesUpdate<"cards">;

const CARDS_KEY = ["cards"];
const INVOICES_KEY = ["invoices"];

/**
 * Hook para listar cartões do usuário
 */
export function useCards(includeDeleted = false) {
  return useQuery({
    queryKey: [...CARDS_KEY, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from("cards")
        .select("*")
        .order("name", { ascending: true });

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Card[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar um cartão específico
 */
export function useCard(id: string | null) {
  return useQuery({
    queryKey: [...CARDS_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Card;
    },
    enabled: !!id,
  });
}

/**
 * Hook para criar cartão (com geração automática de faturas)
 */
export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (card: Omit<CardInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar cartão
      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert({
          ...card,
          user_id: user.id,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 2. Gerar faturas automáticas (mês atual + próximo)
      const periods = generateInvoicePeriods(
        card.billing_day,
        card.due_day,
        2
      );

      const invoices = periods.map((period) => ({
        card_id: newCard.id,
        user_id: user.id,
        reference_month: period.referenceMonth.toISOString().split('T')[0],
        start_date: period.startDate.toISOString().split('T')[0],
        end_date: period.endDate.toISOString().split('T')[0],
        due_date: period.dueDate.toISOString().split('T')[0],
        status: 'open' as const,
        total_amount: 0,
      }));

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoices);

      if (invoiceError) {
        console.error("Erro ao criar faturas:", invoiceError);
        // Não bloqueia a criação do cartão, mas loga o erro
      }

      return newCard as Card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
      toast.success("Cartão criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar cartão:", error);
      toast.error("Erro ao criar cartão. Tente novamente.");
    },
  });
}

/**
 * Hook para atualizar cartão
 */
export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CardUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      toast.success("Cartão atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cartão:", error);
      toast.error("Erro ao atualizar cartão. Tente novamente.");
    },
  });
}

/**
 * Hook para soft delete de cartão
 */
export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cards")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
    },
    onError: (error) => {
      console.error("Erro ao excluir cartão:", error);
      toast.error("Erro ao excluir cartão. Tente novamente.");
    },
  });
}

/**
 * Hook para restaurar cartão (desfazer exclusão)
 */
export function useRestoreCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cards")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      toast.success("Cartão restaurado!");
    },
    onError: (error) => {
      console.error("Erro ao restaurar cartão:", error);
      toast.error("Erro ao restaurar cartão. Tente novamente.");
    },
  });
}
