import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { CalendarIcon, X } from "lucide-react";
import {
  format,
  startOfMonth, endOfMonth,
  startOfDay, endOfDay,
  subDays, subMonths,
} from "date-fns";
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
  };
  onFiltersChange: (filters: TransactionFiltersProps["filters"]) => void;
}

type PeriodKey = "today" | "yesterday" | "7d" | "15d" | "last_month" | "this_month" | "custom";

interface PeriodOption {
  key: PeriodKey;
  label: string;
  getRange: () => { from: Date; to: Date };
}

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    key: "today",
    label: "Hoje",
    getRange: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(now) };
    },
  },
  {
    key: "yesterday",
    label: "Ontem",
    getRange: () => {
      const y = subDays(new Date(), 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    },
  },
  {
    key: "7d",
    label: "7 dias",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "15d",
    label: "15 dias",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 14)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "last_month",
    label: "Mês passado",
    getRange: () => {
      const prev = subMonths(new Date(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
  {
    key: "this_month",
    label: "Mês atual",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
];

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const { data: categories = [] } = useCategories(filters.type);
  const { data: accounts = [] } = useAccounts();
  const hasActiveFilters = filters.type || filters.categoryId || filters.accountId;

  const handlePeriodClick = (option: PeriodOption) => {
    setActivePeriod(option.key);
    const range = option.getRange();
    onFiltersChange({
      ...filters,
      startDate: toDateStr(range.from),
      endDate: toDateStr(range.to),
    });
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        startDate: toDateStr(range.from),
        endDate: toDateStr(range.to),
      });
    }
  };

  const clearFilters = () => {
    setActivePeriod("this_month");
    setCustomRange(undefined);
    const range = PERIOD_OPTIONS.find((o) => o.key === "this_month")!.getRange();
    onFiltersChange({
      startDate: toDateStr(range.from),
      endDate: toDateStr(range.to),
    });
  };

  return (
    <div className="space-y-3">
      {/* Period chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handlePeriodClick(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activePeriod === option.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}

        {/* Custom period */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => setActivePeriod("custom")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activePeriod === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {activePeriod === "custom" && customRange?.from && customRange?.to
                ? `${format(customRange.from, "dd MMM", { locale: ptBR })} - ${format(customRange.to, "dd MMM", { locale: ptBR })}`
                : "Personalizado"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomRangeChange}
              locale={ptBR}
              numberOfMonths={2}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Other filters */}
      <div className="flex flex-wrap items-center gap-2">
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
          <SelectTrigger className="h-9 w-[130px]">
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

        <Select
          value={filters.accountId || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              accountId: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="h-9 w-[150px]">
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
