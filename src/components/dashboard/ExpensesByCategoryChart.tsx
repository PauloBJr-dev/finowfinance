import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { PieChart as PieIcon } from "lucide-react";

const CHART_COLORS = [
  "#1F7A63",
  "#2A9D7E",
  "#35C099",
  "#E0B84C",
  "#7AE5CA",
  "#A8F0DE",
];

interface Props {
  transactions: Array<{
    amount: number;
    type: string;
    categories: { name: string; color: string | null } | null;
  }> | undefined;
  isLoading: boolean;
}

export function ExpensesByCategoryChart({ transactions, isLoading }: Props) {
  const chartData = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.categories?.name || "Sem categoria";
        map.set(name, (map.get(name) || 0) + Number(t.amount));
      });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4 pb-6">
          <Skeleton className="h-36 w-36 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <PieIcon className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sem despesas este mês 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Chart + Center label */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={78}
                dataKey="value"
                paddingAngle={3}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2.5">
          {chartData.slice(0, 5).map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
            return (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                <span className="text-xs font-semibold tabular-nums w-20 text-right">{formatCurrency(item.value)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
