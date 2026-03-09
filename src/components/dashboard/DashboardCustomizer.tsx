import { useRef, useState } from "react";
import { Settings2, RotateCcw, GripVertical } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface Props {
  visibleWidgets: Record<string, boolean>;
  kpiOrder: string[];
  sectionOrder: string[];
  toggleWidget: (id: string) => void;
  reorderKpis: (from: number, to: number) => void;
  reorderSections: (from: number, to: number) => void;
  resetDefaults: () => void;
}

function DraggableList({
  items,
  visibleWidgets,
  toggleWidget,
  onReorder,
}: {
  items: string[];
  visibleWidgets: Record<string, boolean>;
  toggleWidget: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setDragging(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorder(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setDragging(null);
  };

  return (
    <div className="space-y-1">
      {items.map((id, index) => (
        <div
          key={id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 transition-colors cursor-grab active:cursor-grabbing",
            dragging === index && "opacity-50 bg-muted"
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <span className="text-sm flex-1 select-none">{WIDGET_LABELS[id]}</span>
          <Switch
            checked={visibleWidgets[id] ?? true}
            onCheckedChange={() => toggleWidget(id)}
          />
        </div>
      ))}
    </div>
  );
}

export function DashboardCustomizer({
  visibleWidgets,
  kpiOrder,
  sectionOrder,
  toggleWidget,
  reorderKpis,
  reorderSections,
  resetDefaults,
}: Props) {
  const isMobile = useIsMobile();

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">Personalizar dashboard</span>
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Personalizar dashboard</TooltipContent>
      </Tooltip>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>Escolha e reordene os widgets.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Indicadores
            </h4>
            <DraggableList
              items={kpiOrder}
              visibleWidgets={visibleWidgets}
              toggleWidget={toggleWidget}
              onReorder={reorderKpis}
              isMobile={isMobile}
            />
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Seções
            </h4>
            <DraggableList
              items={sectionOrder}
              visibleWidgets={visibleWidgets}
              toggleWidget={toggleWidget}
              onReorder={reorderSections}
              isMobile={isMobile}
            />
          </div>
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
