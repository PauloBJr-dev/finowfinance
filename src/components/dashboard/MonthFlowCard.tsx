import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  income: number;
  expenses: number;
  pendingBills: number;
  isLoading: boolean;
}

export function MonthFlowCard({ income, expenses, pendingBills, isLoading }: Props) {
  const balance = income - expenses;
  const projected = balance - pendingBills;

  const indicators = [
    {
      label: "Saldo do Mês",
      value: balance,
      icon: balance >= 0 ? TrendingUp : TrendingDown,
      color: balance >= 0 ? "text-primary" : "text-destructive",
    },
    {
      label: "Despesas Previstas",
      value: pendingBills,
      icon: Target,
      color: "text-accent",
    },
    {
      label: "Saldo Projetado",
      value: projected,
      icon: projected >= 0 ? TrendingUp : TrendingDown,
      color: projected >= 0 ? "text-primary" : "text-destructive",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Fluxo do Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {indicators.map((item) => (
            <div key={item.label} className="text-center space-y-1">
              <div className="flex justify-center">
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-20 mx-auto" />
              ) : (
                <p className={cn("text-lg font-bold", item.color)}>
                  {formatCurrency(item.value)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
