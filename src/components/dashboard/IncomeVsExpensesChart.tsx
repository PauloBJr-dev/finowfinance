import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatMonthShort } from "@/lib/format";
import { BarChart3 } from "lucide-react";

interface Props {
  transactions: Array<{
    amount: number;
    type: string;
    date: string;
  }> | undefined;
  isLoading: boolean;
}

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function IncomeVsExpensesChart({ transactions, isLoading }: Props) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: Array<{ month: string; label: string; income: number; expenses: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: key,
        label: formatMonthShort(d),
        income: 0,
        expenses: 0,
      });
    }

    transactions?.forEach((t) => {
      const key = t.date.substring(0, 7);
      const entry = months.find((m) => m.month === key);
      if (entry) {
        if (t.type === "income") entry.income += Number(t.amount);
        else entry.expenses += Number(t.amount);
      }
    });

    return months;
  }, [transactions]);

  // Summary for current month
  const currentMonth = chartData[chartData.length - 1];
  const totalIncome = currentMonth?.income ?? 0;
  const totalExpenses = currentMonth?.expenses ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3 pt-4 pb-6" style={{ height: 280 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded" style={{ height: `${30 + Math.random() * 50}%` }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasData = transactions && transactions.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sem dados para exibir ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Receitas vs Despesas</CardTitle>
        {/* Inline summary */}
        <div className="flex gap-6 mt-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Receitas</span>
            <p className="text-sm font-bold text-primary">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Despesas</span>
            <p className="text-sm font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 20% 18%)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(155 10% 60%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(155 10% 50%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompact}
              width={40}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value: string) => (
                <span style={{ color: "hsl(155 10% 60%)" }}>{value}</span>
              )}
            />
            <Bar dataKey="income" name="Receitas" fill="#2A9D7E" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expenses" name="Despesas" fill="hsl(0 40% 50%)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
