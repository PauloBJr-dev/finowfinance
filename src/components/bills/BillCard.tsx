import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Check, AlertTriangle, Calendar, Trash2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Bill } from "@/hooks/use-bills";
import { cn } from "@/lib/utils";
import { resolveCategoryIcon } from "@/lib/category-icons";

interface BillCardProps {
  bill: Bill;
  onPay: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

export function BillCard({ bill, onPay, onDelete }: BillCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = parseISO(bill.due_date);
  const daysUntilDue = differenceInDays(dueDate, today);
  
  const isPaid = bill.status === "paid";
  const isOverdue = bill.status === "overdue" || (!isPaid && daysUntilDue < 0);
  const isDueSoon = !isPaid && !isOverdue && daysUntilDue <= 3;
  
  const getStatusBadge = () => {
    if (isPaid) {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <Check className="h-3 w-3 mr-1" />
          Paga {bill.paid_at && `em ${format(parseISO(bill.paid_at), "dd/MM", { locale: ptBR })}`}
        </Badge>
      );
    }
    
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencida há {Math.abs(daysUntilDue)} {Math.abs(daysUntilDue) === 1 ? "dia" : "dias"}
        </Badge>
      );
    }
    
    if (isDueSoon) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
          <Clock className="h-3 w-3 mr-1" />
          Vence em {daysUntilDue === 0 ? "hoje" : `${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"}`}
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <Calendar className="h-3 w-3 mr-1" />
        Vence em {daysUntilDue} dias
      </Badge>
    );
  };

  const CategoryIcon = resolveCategoryIcon(bill.category?.icon);
  const categoryColor = bill.category?.color || "hsl(var(--muted-foreground))";

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md",
        isPaid && "opacity-60",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: bill.category?.color
                ? `${bill.category.color}18`
                : "hsl(var(--muted))",
            }}
          >
            <CategoryIcon
              className="h-5 w-5"
              style={{ color: categoryColor }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{bill.description}</h3>
            <p className="text-sm text-muted-foreground">{bill.category?.name || "Sem categoria"}</p>
            
            <div className="mt-2">
              {getStatusBadge()}
            </div>
          </div>
        </div>
        
        {/* Value — always visible */}
        <span className={cn(
          "text-lg font-semibold shrink-0",
          isPaid && "text-muted-foreground",
          isOverdue && "text-destructive"
        )}>
          {formatCurrency(bill.amount)}
        </span>
      </div>

      {/* Action buttons — separate row on mobile */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
        {bill.recurrence_group_id && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Recorrente • dia {format(dueDate, "dd", { locale: ptBR })}
          </p>
        )}
        
        <div className="flex gap-2 ml-auto">
          {!isPaid && (
            <Button
              size="sm"
              onClick={() => onPay(bill)}
              className="h-9 min-h-[48px] sm:min-h-0 sm:h-8"
            >
              Pagar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(bill)}
            className="h-9 w-9 min-h-[48px] sm:min-h-0 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
