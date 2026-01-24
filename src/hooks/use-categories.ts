import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type CategoryType = "expense" | "income";

const CATEGORIES_KEY = ["categories"];

/**
 * Hook para listar categorias (do sistema + do usuário)
 */
export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, { type }],
    queryFn: async () => {
      let query = supabase
        .from("categories")
        .select("*")
        .is("deleted_at", null)
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (categorias mudam pouco)
  });
}

/**
 * Hook para buscar uma categoria específica
 */
export function useCategory(id: string | null) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!id,
  });
}

/**
 * Hook para obter ícone e cor de uma categoria
 */
export function getCategoryDisplay(category: Category | null) {
  if (!category) {
    return {
      icon: "HelpCircle",
      color: "hsl(var(--muted-foreground))",
      name: "Sem categoria",
    };
  }

  return {
    icon: category.icon || "Tag",
    color: category.color || "hsl(var(--primary))",
    name: category.name,
  };
}
