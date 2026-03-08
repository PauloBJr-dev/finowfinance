import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { CalendarClock, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
}

interface Props {
  bills: Bill[] | undefined;
  isLoading: boolean;
}

function getCountdown(dueDate: string): { text: string; overdue: boolean; daysLeft: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d atrasada`, overdue: true, daysLeft: diffDays };
  if (diffDays === 0) return { text: "Hoje", overdue: false, daysLeft: 0 };
  if (diffDays === 1) return { text: "Amanhã", overdue: false, daysLeft: 1 };
  return { text: `${diffDays} dias`, overdue: false, daysLeft: diffDays };
}

export function UpcomingBillsCard({ bills, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <CalendarClock className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma conta pendente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="divide-y divide-border">
          {bills.map((bill) => {
            const countdown = getCountdown(bill.due_date);
            return (
              <div key={bill.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0",
                  countdown.overdue 
                    ? "bg-destructive/10 text-destructive" 
                    : countdown.daysLeft <= 2 
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-primary/10 text-primary"
                )}>
                  {countdown.overdue ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{bill.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{formatDate(bill.due_date)}</span>
                    <span className={cn(
                      "text-[11px] font-medium",
                      countdown.overdue 
                        ? "text-destructive" 
                        : countdown.daysLeft <= 2 
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                    )}>
                      · {countdown.text}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <p className={cn(
                  "text-sm font-bold tabular-nums whitespace-nowrap",
                  countdown.overdue ? "text-destructive" : "text-foreground"
                )}>
                  {formatCurrency(Number(bill.amount))}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
