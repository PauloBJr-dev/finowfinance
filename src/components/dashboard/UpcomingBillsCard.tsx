import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { CalendarClock, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  if (diffDays === 0) return { text: "Vence hoje", overdue: false, daysLeft: 0 };
  if (diffDays === 1) return { text: "Amanhã", overdue: false, daysLeft: 1 };
  return { text: `em ${diffDays} dias`, overdue: false, daysLeft: diffDays };
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return format(date, "dd MMM", { locale: ptBR });
}

export function UpcomingBillsCard({ bills, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 py-4">
          <CalendarClock className="h-5 w-5 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma conta pendente — tudo em dia! 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Próximos Vencimentos</CardTitle>
        <Link to="/contas-pagar" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {bills.map((bill) => {
          const countdown = getCountdown(bill.due_date);
          const urgencyColor = countdown.overdue
            ? "text-destructive"
            : countdown.daysLeft <= 2
              ? "text-yellow-500"
              : "text-muted-foreground";
          const urgencyBg = countdown.overdue
            ? "bg-destructive/8"
            : countdown.daysLeft <= 2
              ? "bg-yellow-500/8"
              : "bg-muted/50";

          return (
            <div
              key={bill.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                urgencyBg
              )}
            >
              {/* Status dot */}
              <div className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                countdown.overdue
                  ? "bg-destructive"
                  : countdown.daysLeft <= 2
                    ? "bg-yellow-500"
                    : "bg-primary"
              )} />

              {/* Description */}
              <span className="text-sm font-medium truncate flex-1 min-w-0">
                {bill.description}
              </span>

              {/* Countdown */}
              <span className={cn("text-[11px] font-medium whitespace-nowrap", urgencyColor)}>
                {countdown.text}
              </span>

              {/* Amount */}
              <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                {formatCurrency(Number(bill.amount))}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
