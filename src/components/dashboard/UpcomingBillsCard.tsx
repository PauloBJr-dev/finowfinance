import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { CalendarClock } from "lucide-react";
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

function getCountdown(dueDate: string): { text: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `vencida há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? "s" : ""}`, overdue: true };
  if (diffDays === 0) return { text: "vence hoje", overdue: false };
  if (diffDays === 1) return { text: "vence amanhã", overdue: false };
  return { text: `vence em ${diffDays} dias`, overdue: false };
}

export function UpcomingBillsCard({ bills, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Próximos Vencimentos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Próximos Vencimentos</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
          <CalendarClock className="h-8 w-8 mb-2 opacity-40" />
          <p>Nenhuma conta a pagar pendente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Próximos Vencimentos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {bills.map((bill) => {
          const countdown = getCountdown(bill.due_date);
          return (
            <div key={bill.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{bill.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(bill.due_date)}</span>
                  <Badge
                    variant={countdown.overdue ? "destructive" : "secondary"}
                    className={cn("text-[10px] px-1.5 py-0", countdown.overdue && "animate-pulse")}
                  >
                    {countdown.text}
                  </Badge>
                </div>
              </div>
              <p className={cn("text-sm font-bold whitespace-nowrap", countdown.overdue ? "text-destructive" : "text-foreground")}>
                {formatCurrency(Number(bill.amount))}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
