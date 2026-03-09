import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { WIDGET_LABELS } from "@/hooks/use-dashboard-preferences";

interface Props {
  visibleWidgets: Record<string, boolean>;
  toggleWidget: (id: string) => void;
  resetDefaults: () => void;
}

const WIDGET_ORDER = [
  "micro_insight",
  "kpi_balance",
  "kpi_expenses",
  "kpi_income",
  "kpi_net",
  "kpi_benefit",
  "month_flow",
  "reminders",
  "ai_insights",
  "expenses_chart",
  "upcoming_bills",
  "recent_transactions",
];

export function DashboardCustomizer({ visibleWidgets, toggleWidget, resetDefaults }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Personalizar dashboard</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>Escolha quais widgets exibir.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {WIDGET_ORDER.map((id) => (
            <div key={id} className="flex items-center justify-between">
              <span className="text-sm">{WIDGET_LABELS[id]}</span>
              <Switch
                checked={visibleWidgets[id] ?? true}
                onCheckedChange={() => toggleWidget(id)}
              />
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-6 w-full gap-2"
          onClick={resetDefaults}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar padrões
        </Button>
      </SheetContent>
    </Sheet>
  );
}
