import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { X, Search } from "lucide-react";

interface TransactionFiltersProps {
  filters: {
    startDate?: string;
    endDate?: string;
    type?: "expense" | "income";
    categoryId?: string;
    accountId?: string;
  };
  onFiltersChange: (filters: TransactionFiltersProps["filters"]) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function TransactionFilters({ filters, onFiltersChange, searchQuery = "", onSearchChange }: TransactionFiltersProps) {
  const { data: categories = [] } = useCategories(filters.type);
  const { data: accounts = [] } = useAccounts();
  const hasActiveFilters = filters.type || filters.categoryId || filters.accountId;

  const clearFilters = () => {
    onFiltersChange({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  };

  return (
    <div className="space-y-3">
      {/* Liquid glass search bar */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar transações..."
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-10 py-2.5 text-sm backdrop-blur-xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-white/5 dark:border-white/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

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
