import { useState } from "react";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  Car,
  Home,
  Utensils,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  Music,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Building,
  Users,
  HelpCircle,
  Tag,
} from "lucide-react";

type CategoryType = "expense" | "income";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  type?: CategoryType;
  className?: string;
}

// Mapeamento de nomes de ícones para componentes
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  Car,
  Home,
  Utensils,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  Music,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Building,
  Users,
  HelpCircle,
  Tag,
};

/**
 * Grid de seleção de categorias
 */
export function CategorySelect({
  value,
  onChange,
  type,
  className,
}: CategorySelectProps) {
  const { data: categories, isLoading } = useCategories(type);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-4 gap-2", className)}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma categoria disponível
      </p>
    );
  }

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon || "Tag"] || Tag;
        const isSelected = value === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg p-3 transition-all",
              "border-2 hover:bg-muted/50",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full mb-1"
              style={{
                backgroundColor: category.color
                  ? `${category.color}20`
                  : "hsl(var(--muted))",
              }}
            >
              <IconComponent
                className="h-4 w-4"
                style={{
                  color: category.color || "hsl(var(--muted-foreground))",
                }}
              />
            </div>
            <span
              className={cn(
                "text-xs font-medium text-center line-clamp-1",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
