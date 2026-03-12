import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

type QuickFilter = "month" | "today" | "yesterday";

interface MonthNavigatorProps {
  onPeriodChange: (startDate: string, endDate: string) => void;
}

export function MonthNavigator({ onPeriodChange }: MonthNavigatorProps) {
  const [month, setMonth] = useState(new Date());
  const [activeQuick, setActiveQuick] = useState<QuickFilter>("month");

  const handlePreviousMonth = () => {
    const prev = subMonths(month, 1);
    setMonth(prev);
    setActiveQuick("month");
    onPeriodChange(toDateStr(startOfMonth(prev)), toDateStr(endOfMonth(prev)));
  };

  const handleNextMonth = () => {
    const next = addMonths(month, 1);
    setMonth(next);
    setActiveQuick("month");
    onPeriodChange(toDateStr(startOfMonth(next)), toDateStr(endOfMonth(next)));
  };

  const handleToday = () => {
    const today = new Date();
    const str = toDateStr(today);
    setActiveQuick("today");
    onPeriodChange(str, str);
  };

  const handleYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    const str = toDateStr(yesterday);
    setActiveQuick("yesterday");
    onPeriodChange(str, str);
  };

  return (
    <div className="space-y-2">
      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-lg font-medium min-w-[180px] text-center capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={handleToday}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            activeQuick === "today"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          Hoje
        </button>
        <button
          onClick={handleYesterday}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            activeQuick === "yesterday"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          Ontem
        </button>
      </div>
    </div>
  );
}
