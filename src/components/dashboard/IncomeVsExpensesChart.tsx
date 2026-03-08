import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatMonthShort } from "@/lib/format";

interface Props {
  transactions: Array<{
    amount: number;
    type: string;
    date: string;
  }> | undefined;
  isLoading: boolean;
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
      const key = t.date.substring(0, 7); // YYYY-MM
      const entry = months.find((m) => m.month === key);
      if (entry) {
        if (t.type === "income") entry.income += Number(t.amount);
        else entry.expenses += Number(t.amount);
      }
    });

    return months;
  }, [transactions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Receitas vs Despesas</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-2 h-[250px] pb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded" style={{ height: `${40 + Math.random() * 60}%` }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasData = transactions && transactions.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Receitas vs Despesas</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
          <p>Sem dados para exibir ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Receitas vs Despesas</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(160 20% 18%)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(155 10% 60%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(160 25% 11%)",
                border: "1px solid hsl(160 20% 18%)",
                borderRadius: "8px",
                color: "hsl(160 10% 95%)",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(155 10% 60%)" }}
            />
            <Bar dataKey="income" name="Receitas" fill="#2A9D7E" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name="Despesas" fill="hsl(0 40% 50%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
