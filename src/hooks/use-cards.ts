import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Card = Tables<"cards">;
type CardInsert = TablesInsert<"cards">;
type CardUpdate = TablesUpdate<"cards">;

const CARDS_KEY = ["cards"];
const INVOICES_KEY = ["invoices"];

/**
 * Dados para criação de cartão com fatura inicial
 */
export interface CreateCardData {
  name: string;
  credit_limit: number;
  billing_day: number;
  due_day: number;
  initial_invoice_month?: string; // Formato: YYYY-MM-01
  create_previous_closed?: boolean;
}

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
 * Hook para criar cartão com fatura inicial definida pelo usuário
 * 
 * NOVA MECÂNICA:
 * - Usuário escolhe qual é a fatura atual aberta (mês/ano)
 * - Sistema cria a fatura como status 'open'
 * - Opcionalmente cria a fatura anterior como 'closed'
 */
export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardData: CreateCardData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar cartão
      const { data: newCard, error: cardError } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          name: cardData.name,
          credit_limit: cardData.credit_limit,
          billing_day: cardData.billing_day,
          due_day: cardData.due_day,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // 2. SEMPRE criar fatura inicial (obrigatório)
      // Se não foi especificado, usa o mês atual
      const invoiceMonth = cardData.initial_invoice_month || 
        new Date().toISOString().slice(0, 8) + "01"; // YYYY-MM-01
      
      const { error: invoiceError } = await supabase.rpc('create_initial_invoice', {
        p_card_id: newCard.id,
        p_user_id: user.id,
        p_initial_invoice_month: invoiceMonth,
        p_create_previous_closed: cardData.create_previous_closed ?? false,
      });

      if (invoiceError) {
        console.error("Erro ao criar fatura inicial:", invoiceError);
        // Mesmo com erro na fatura, o cartão foi criado
        toast.warning("Cartão criado, mas houve um erro ao criar a fatura inicial.");
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
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY }); // Invalidar faturas também
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
