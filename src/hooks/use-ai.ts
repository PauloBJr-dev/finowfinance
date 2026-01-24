import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface CategorySuggestion {
  category_id: string;
  category_name: string;
  confidence_score: number;
  data_points: string[];
  fallback?: boolean;
  error?: string;
}

interface AIUsage {
  agent_name: string;
  tokens_used: number;
  request_count: number;
  date: string;
}

interface AISettings {
  id: string;
  user_id: string;
  categorization_enabled: boolean;
  reminders_enabled: boolean;
  daily_token_limit: number;
}

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  data_points: Record<string, unknown>;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  dismissed_at?: string;
  expires_at?: string;
  created_at: string;
}

const AI_SETTINGS_KEY = ["ai-settings"];
const AI_USAGE_KEY = ["ai-usage"];
const REMINDERS_KEY = ["reminders"];

// Constantes de governança
const GLOBAL_DAILY_LIMIT = 100000;
const DEFAULT_USER_LIMIT = 5000;

/**
 * Hook para buscar configurações de IA do usuário
 */
export function useAISettings() {
  return useQuery({
    queryKey: AI_SETTINGS_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Se não existe, criar com valores padrão
        if (error.code === "PGRST116") {
          const { data: newSettings, error: insertError } = await supabase
            .from("ai_settings")
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newSettings as AISettings;
        }
        throw error;
      }

      return data as AISettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para atualizar configurações de IA
 */
export function useUpdateAISettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<AISettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("ai_settings")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as AISettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_SETTINGS_KEY });
      toast.success("Configurações de IA atualizadas!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar configurações de IA:", error);
      toast.error("Erro ao atualizar configurações.");
    },
  });
}

/**
 * Hook para buscar uso de tokens de IA
 */
export function useAIUsage(days = 7) {
  return useQuery({
    queryKey: [...AI_USAGE_KEY, days],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("ai_token_usage")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return data as AIUsage[];
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para buscar uso de tokens de hoje
 */
export function useTodayUsage() {
  return useQuery({
    queryKey: [...AI_USAGE_KEY, "today"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, limit: DEFAULT_USER_LIMIT, percentage: 0 };

      const today = new Date().toISOString().split('T')[0];

      const [usageResult, settingsResult] = await Promise.all([
        supabase
          .from("ai_token_usage")
          .select("tokens_used")
          .eq("user_id", user.id)
          .eq("date", today),
        supabase
          .from("ai_settings")
          .select("daily_token_limit")
          .eq("user_id", user.id)
          .single()
      ]);

      const total = usageResult.data?.reduce((sum, u) => sum + u.tokens_used, 0) || 0;
      const limit = settingsResult.data?.daily_token_limit || DEFAULT_USER_LIMIT;
      const percentage = Math.min((total / limit) * 100, 100);

      return { total, limit, percentage };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para sugerir categoria via IA
 */
export function useSuggestCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      description: string;
      amount: number;
      payment_method: string;
      account_type?: string;
    }): Promise<CategorySuggestion> => {
      const { data, error } = await supabase.functions.invoke("ai-categorize", {
        body: params,
      });

      if (error) {
        console.error("Erro ao sugerir categoria:", error);
        return {
          category_id: "",
          category_name: "Outros",
          confidence_score: 0,
          data_points: ["Fallback: erro na IA"],
          fallback: true,
          error: error.message,
        };
      }

      // Invalidar cache de uso
      queryClient.invalidateQueries({ queryKey: AI_USAGE_KEY });

      return data as CategorySuggestion;
    },
  });
}

/**
 * Hook para buscar reminders não lidos
 */
export function useReminders(includeRead = false) {
  return useQuery({
    queryKey: [...REMINDERS_KEY, { includeRead }],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false });

      if (!includeRead) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Reminder[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para contar reminders não lidos
 */
export function useUnreadRemindersCount() {
  return useQuery({
    queryKey: [...REMINDERS_KEY, "count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .is("dismissed_at", null);

      if (error) return 0;
      return count || 0;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para marcar reminder como lido
 */
export function useMarkReminderRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
    },
  });
}

/**
 * Hook para dispensar reminder
 */
export function useDismissReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      toast.success("Lembrete dispensado");
    },
  });
}
