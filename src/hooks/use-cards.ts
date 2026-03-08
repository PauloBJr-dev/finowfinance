import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export interface Card {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number | null;
  billing_day: number;
  due_day: number;
  deleted_at: string | null;
  created_at: string;
}

export interface CreateCardInput {
  name: string;
  credit_limit?: number;
  billing_day: number;
  due_day: number;
}

export interface UpdateCardInput extends Partial<CreateCardInput> {
  id: string;
}

const CARDS_KEY = ['cards'];

export function useCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...CARDS_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Card[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCardInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      if (input.billing_day < 1 || input.billing_day > 31) {
        throw new Error('Dia de fechamento deve ser entre 1 e 31');
      }
      if (input.due_day < 1 || input.due_day > 31) {
        throw new Error('Dia de vencimento deve ser entre 1 e 31');
      }

      const { data, error } = await supabase
        .from('cards')
        .insert({
          user_id: user.id,
          name: input.name,
          credit_limit: input.credit_limit ?? 0,
          billing_day: input.billing_day,
          due_day: input.due_day,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      toast.success('Cartão adicionado!', {
        description: `${data.name} foi adicionado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar cartão', { description: error.message });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCardInput) => {
      const { id, ...updates } = input;

      if (updates.billing_day !== undefined && (updates.billing_day < 1 || updates.billing_day > 31)) {
        throw new Error('Dia de fechamento deve ser entre 1 e 31');
      }
      if (updates.due_day !== undefined && (updates.due_day < 1 || updates.due_day > 31)) {
        throw new Error('Dia de vencimento deve ser entre 1 e 31');
      }

      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      toast.success('Cartão atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar cartão', { description: error.message });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('cards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDS_KEY });
      toast.success('Cartão removido.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover cartão', { description: error.message });
    },
  });
}
