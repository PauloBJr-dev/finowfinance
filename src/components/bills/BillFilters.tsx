import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillStatus } from "@/hooks/use-bills";

interface BillFiltersProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  statusFilter: BillStatus | "all";
  onStatusFilterChange: (status: BillStatus | "all") => void;
  counts?: {
    pending: number;
    overdue: number;
    paid: number;
    all: number;
  };
}

export function BillFilters({
  month,
  onMonthChange,
  statusFilter,
  onStatusFilterChange,
  counts,
}: BillFiltersProps) {
  const handlePreviousMonth = () => {
    onMonthChange(subMonths(month, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(month, 1));
  };

  return (
    <div className="space-y-4">
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

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as BillStatus | "all")}
        className="w-full"
      >
        <TabsList className="w-full flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="pending" className="flex-1 min-w-0 text-xs sm:text-sm whitespace-nowrap">
            A Vencer
            {counts && counts.pending > 0 && (
              <span className="ml-1 text-xs opacity-70">({counts.pending})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1 min-w-0 text-xs sm:text-sm whitespace-nowrap">
            Vencidas
            {counts && counts.overdue > 0 && (
              <span className="ml-1 text-xs opacity-70">({counts.overdue})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1 min-w-0 text-xs sm:text-sm whitespace-nowrap">
            Pagas
            {counts && counts.paid > 0 && (
              <span className="ml-1 text-xs opacity-70">({counts.paid})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 min-w-0 text-xs sm:text-sm whitespace-nowrap">
            Todas
            {counts && counts.all > 0 && (
              <span className="ml-1 text-xs opacity-70">({counts.all})</span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
