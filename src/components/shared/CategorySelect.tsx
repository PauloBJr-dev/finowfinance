import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag, Car, Home, Utensils, Heart, Briefcase, GraduationCap,
  Plane, Gift, Smartphone, Dumbbell, Music, ShoppingCart, Wallet,
  TrendingUp, Building, Users, HelpCircle, Tag,
} from "lucide-react";

type CategoryType = "expense" | "income";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  type?: CategoryType;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag, Car, Home, Utensils, Heart, Briefcase, GraduationCap,
  Plane, Gift, Smartphone, Dumbbell, Music, ShoppingCart, Wallet,
  TrendingUp, Building, Users, HelpCircle, Tag,
};

const iconNameMap: Record<string, string> = {
  "shopping-bag": "ShoppingBag", "shopping-cart": "ShoppingCart", "car": "Car",
  "home": "Home", "utensils": "Utensils", "heart": "Heart", "briefcase": "Briefcase",
  "graduation-cap": "GraduationCap", "plane": "Plane", "gift": "Gift",
  "smartphone": "Smartphone", "dumbbell": "Dumbbell", "music": "Music",
  "wallet": "Wallet", "trending-up": "TrendingUp", "building": "Building",
  "users": "Users", "help-circle": "HelpCircle", "tag": "Tag",
};

const resolveIconName = (icon: string | null | undefined): string => {
  if (!icon) return "Tag";
  if (iconNameMap[icon]) return iconNameMap[icon];
  return icon;
};

export function CategorySelect({ value, onChange, type, className }: CategorySelectProps) {
  const { data: categories, isLoading } = useCategories(type);

  if (isLoading) {
    return <Skeleton className="h-10 w-full rounded-md" />;
  }

  if (!categories?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma categoria disponível
      </p>
    );
  }

  const selectedCategory = categories.find(c => c.id === value);
  const SelectedIcon = selectedCategory
    ? iconMap[resolveIconName(selectedCategory.icon)] || Tag
    : null;

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Selecione uma categoria">
          {selectedCategory && SelectedIcon && (
            <span className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : "hsl(var(--muted))",
                }}
              >
                <SelectedIcon
                  className="h-3 w-3"
                  style={{ color: selectedCategory.color || "hsl(var(--muted-foreground))" }}
                />
              </span>
              {selectedCategory.name}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover max-h-60">
        {categories.map((category) => {
          const resolvedIcon = resolveIconName(category.icon);
          const IconComponent = iconMap[resolvedIcon] || Tag;
          return (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: category.color ? `${category.color}20` : "hsl(var(--muted))",
                  }}
                >
                  <IconComponent
                    className="h-3 w-3"
                    style={{ color: category.color || "hsl(var(--muted-foreground))" }}
                  />
                </span>
                {category.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
