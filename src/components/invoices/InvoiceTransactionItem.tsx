import { resolveCategoryIcon } from "@/lib/category-icons";
import { formatCurrency } from "@/lib/format";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface InvoiceTransactionItemProps {
  description: string | null;
  amount: number;
  date: string;
  category?: Category | null;
  isLast?: boolean;
}

export function InvoiceTransactionItem({
  description,
  amount,
  date,
  category,
  isLast = false,
}: InvoiceTransactionItemProps) {
  const Icon = resolveCategoryIcon(category?.icon);
  const color = category?.color || "hsl(var(--muted-foreground))";

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(date + "T12:00:00"));

  return (
    <div
      className={`flex items-center gap-3 min-h-[56px] px-4 py-3 cursor-pointer active:opacity-70 ${
        !isLast ? "border-b border-border/40" : ""
      }`}
    >
      {/* Category icon */}
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{
          width: 36,
          height: 36,
          backgroundColor: `${color}26`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>

      {/* Central block */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {description || "Sem descrição"}
        </span>
        <span className="text-xs text-muted-foreground">
          {category?.name || "Sem categoria"}
          {" · "}
          {formattedDate}
        </span>
      </div>

      {/* Amount */}
      <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
