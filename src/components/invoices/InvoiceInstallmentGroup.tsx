import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveCategoryIcon } from "@/lib/category-icons";
import { formatCurrency } from "@/lib/format";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface InstallmentItem {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
}

interface InvoiceInstallmentGroupProps {
  description: string;
  category?: Category | null;
  currentInstallmentNumber: number;
  totalInstallments: number;
  /** Total amount of installments in this invoice for this group */
  groupTotal: number;
  installments: InstallmentItem[];
  isLast?: boolean;
}

export function InvoiceInstallmentGroup({
  description,
  category,
  currentInstallmentNumber,
  totalInstallments,
  groupTotal,
  installments,
  isLast = false,
}: InvoiceInstallmentGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = resolveCategoryIcon(category?.icon);
  const color = category?.color || "hsl(var(--muted-foreground))";

  return (
    <div className={!isLast ? "border-b border-border/40" : ""}>
      {/* Header — always visible */}
      <div
        className="flex items-center gap-3 min-h-[56px] px-4 py-3 cursor-pointer active:opacity-70"
        onClick={() => setExpanded((v) => !v)}
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {description}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 shrink-0"
            >
              {currentInstallmentNumber}/{totalInstallments}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {category?.name || "Sem categoria"}
          </span>
        </div>

        {/* Amount */}
        <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">
          {formatCurrency(groupTotal)}
        </span>

        {/* Chevron */}
        <ChevronDown
          className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </div>

      {/* Expanded sub-list */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: expanded ? 500 : 0 }}
      >
        <div className="pl-4 pb-2">
          {installments.map((inst) => {
            const fmtDate = new Intl.DateTimeFormat("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            }).format(new Date(inst.due_date + "T12:00:00"));

            return (
              <div
                key={inst.id}
                className="flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground"
              >
                <span>
                  Parcela {inst.installment_number}/{totalInstallments} ·{" "}
                  {fmtDate}
                </span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(inst.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
