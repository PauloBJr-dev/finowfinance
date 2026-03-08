import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";

const CHART_COLORS = [
  "#1F7A63",
  "#2A9D7E",
  "#35C099",
  "#4DD9B4",
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <Skeleton className="h-40 w-40 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[250px] text-muted-foreground text-sm">
          <p>Sem despesas este mês 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(160 25% 11%)",
                border: "1px solid hsl(160 20% 18%)",
                borderRadius: "8px",
                color: "hsl(160 10% 95%)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-2">
          {chartData.slice(0, 5).map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
