import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useCards } from "@/hooks/use-cards";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface TransactionFiltersProps {
  filters: {
    startDate?: string;
    endDate?: string;
    type?: "expense" | "income";
    categoryId?: string;
    accountId?: string;
    cardId?: string;
  };
  onFiltersChange: (filters: TransactionFiltersProps["filters"]) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.startDate && filters.endDate) {
      return {
        from: new Date(filters.startDate),
        to: new Date(filters.endDate),
      };
    }
    return {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    };
  });

  const { data: categories = [] } = useCategories(filters.type);
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();

  const hasActiveFilters = filters.type || filters.categoryId || filters.accountId || filters.cardId;

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onFiltersChange({
      ...filters,
      startDate: range?.from?.toISOString().split('T')[0],
      endDate: range?.to?.toISOString().split('T')[0],
    });
  };

  const clearFilters = () => {
    const defaultRange = {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    };
    setDateRange(defaultRange);
    onFiltersChange({
      startDate: defaultRange.from.toISOString().split('T')[0],
      endDate: defaultRange.to.toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd MMM", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
                )
              ) : (
                "Selecionar período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeChange}
              locale={ptBR}
              numberOfMonths={2}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Type Filter */}
        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              type: value === "all" ? undefined : (value as "expense" | "income"),
              categoryId: undefined, // Reset category when type changes
            })
          }
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              categoryId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="h-9 w-[150px]">
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

        {/* Account/Card Filter */}
        <Select
          value={filters.accountId || filters.cardId || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              onFiltersChange({
                ...filters,
                accountId: undefined,
                cardId: undefined,
              });
            } else if (value.startsWith("account:")) {
              onFiltersChange({
                ...filters,
                accountId: value.replace("account:", ""),
                cardId: undefined,
              });
            } else if (value.startsWith("card:")) {
              onFiltersChange({
                ...filters,
                accountId: undefined,
                cardId: value.replace("card:", ""),
              });
            }
          }}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Conta/Cartão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {accounts.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Contas
                </div>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={`account:${acc.id}`}>
                    {acc.name}
                  </SelectItem>
                ))}
              </>
            )}
            {cards.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Cartões
                </div>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={`card:${card.id}`}>
                    {card.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
