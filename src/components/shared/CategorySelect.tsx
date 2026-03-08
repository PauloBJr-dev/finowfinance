import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveCategoryIcon } from "@/lib/category-icons";

type CategoryType = "expense" | "income";

interface CategorySelectProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  type?: CategoryType;
  className?: string;
}

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
    ? resolveCategoryIcon(selectedCategory.icon)
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
          const IconComponent = resolveCategoryIcon(category.icon);
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
