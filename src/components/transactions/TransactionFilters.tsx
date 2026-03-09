import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { X } from "lucide-react";
import { PeriodFilter } from "@/components/shared/PeriodFilter";

interface TransactionFiltersProps {
  filters: {
    startDate?: string;
    endDate?: string;
    type?: "expense" | "income";
    categoryId?: string;
    accountId?: string;
  };
  onFiltersChange: (filters: TransactionFiltersProps["filters"]) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const { data: categories = [] } = useCategories(filters.type);
  const { data: accounts = [] } = useAccounts();
  const hasActiveFilters = filters.type || filters.categoryId || filters.accountId;

  const handlePeriodChange = (startDate: string, endDate: string) => {
    onFiltersChange({ ...filters, startDate, endDate });
  };

  const clearFilters = () => {
    onFiltersChange({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  };

  return (
    <div className="space-y-3">
      <PeriodFilter onPeriodChange={handlePeriodChange} />

      <div className="grid grid-cols-3 gap-2">
        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              type: value === "all" ? undefined : (value as "expense" | "income"),
              categoryId: undefined,
            })
          }
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              categoryId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.accountId || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              accountId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
