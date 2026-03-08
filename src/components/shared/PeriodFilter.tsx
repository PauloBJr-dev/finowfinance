import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  format,
  startOfMonth, endOfMonth,
  startOfDay, endOfDay,
  subDays, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

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

interface PeriodFilterProps {
  onPeriodChange: (startDate: string, endDate: string) => void;
  defaultPeriod?: PeriodKey;
}

export function PeriodFilter({ onPeriodChange, defaultPeriod = "this_month" }: PeriodFilterProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>(defaultPeriod);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const handlePeriodClick = (option: PeriodOption) => {
    setActivePeriod(option.key);
    const range = option.getRange();
    onPeriodChange(toDateStr(range.from), toDateStr(range.to));
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      onPeriodChange(toDateStr(range.from), toDateStr(range.to));
    }
  };

  return (
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
  );
}
