import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  format,
  startOfMonth, endOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRange } from "react-day-picker";

type PeriodKey = "last_month" | "this_month" | "custom";

interface PeriodOption {
  key: PeriodKey;
  label: string;
  getRange: () => { from: Date; to: Date };
}

const PERIOD_OPTIONS: PeriodOption[] = [
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
  const isMobile = useIsMobile();
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
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap md:flex-wrap pb-1 -mb-1">
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
            numberOfMonths={isMobile ? 1 : 2}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
