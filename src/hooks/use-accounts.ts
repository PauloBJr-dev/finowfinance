import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Account = Tables<"accounts">;
type AccountInsert = TablesInsert<"accounts">;
type AccountUpdate = TablesUpdate<"accounts">;

const ACCOUNTS_KEY = ["accounts"];

/**
 * Hook para listar contas do usuário (read-only, direct query is fine)
 */
export function useAccounts(includeDeleted = false) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, { includeDeleted }],
    queryFn: async () => {
      let query = supabase
        .from("accounts")
        .select("*")
        .order("name", { ascending: true });

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Account[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar uma conta específica
 */
export function useAccount(id: string | null) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Account;
    },
    enabled: !!id,
  });
}

/**
 * Hook para criar conta via Edge Function (server-side validation)
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Omit<AccountInsert, "user_id">) => {
      const { data, error } = await supabase.functions.invoke('accounts', {
        method: 'POST',
        body: account,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      toast.success("Conta criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar conta:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar conta. Tente novamente.");
    },
  });
}

/**
 * Hook para atualizar conta via Edge Function
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AccountUpdate & { id: string }) => {
      const { data, error } = await supabase.functions.invoke(`accounts/${id}`, {
        method: 'PUT',
        body: updates,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as Account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      toast.success("Conta atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar conta:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar conta. Tente novamente.");
    },
  });
}

/**
 * Hook para soft delete de conta via Edge Function
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`accounts/${id}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
    onError: (error) => {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta. Tente novamente.");
    },
  });
}

/**
 * Hook para restaurar conta via Edge Function
 */
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`accounts/${id}`, {
        method: 'PATCH',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      toast.success("Conta restaurada!");
    },
    onError: (error) => {
      console.error("Erro ao restaurar conta:", error);
      toast.error("Erro ao restaurar conta. Tente novamente.");
    },
  });
}

// NOTA: A função useUpdateAccountBalance foi REMOVIDA.
// O saldo das contas é atualizado exclusivamente via trigger no banco de dados.
