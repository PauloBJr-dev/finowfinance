import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  previous: number | null;
  /** Se true, aumento é ruim (ex: despesas). Se false, aumento é bom (ex: receitas). */
  invertColor?: boolean;
}

export function KpiComparisonBadge({ current, previous, invertColor = false }: Props) {
  if (previous === null || previous === 0) return null;

  const pctChange = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(pctChange));

  if (rounded === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Minus className="h-3 w-3" />
        <span>Igual ao mês anterior</span>
      </div>
    );
  }

  const isUp = pctChange > 0;
  // Para despesas (invertColor=true): subir é ruim, descer é bom
  // Para receitas (invertColor=false): subir é bom, descer é ruim
  const isFavorable = invertColor ? !isUp : isUp;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs mt-1",
        isFavorable ? "text-primary" : "text-destructive"
      )}
    >
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isUp ? "↑" : "↓"} {rounded}% vs mês anterior
      </span>
    </div>
  );
}
