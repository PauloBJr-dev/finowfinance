import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "./use-auth";

type Profile = Tables<"profiles">;
type ProfileUpdate = TablesUpdate<"profiles">;

const PROFILE_KEY = ["profile"];

/**
 * Hook para buscar perfil do usuário atual
 */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...PROFILE_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para atualizar perfil
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Omit<ProfileUpdate, "id">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Perfil atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    },
  });
}
