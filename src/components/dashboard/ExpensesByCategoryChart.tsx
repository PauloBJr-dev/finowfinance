import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { PieChart as PieIcon } from "lucide-react";
import { resolveCategoryIcon } from "@/lib/category-icons";
import { usePrivacy } from "@/contexts/PrivacyContext";

const FALLBACK_COLORS = [
  "#1F7A63", "#2A9D7E", "#35C099", "#E0B84C", "#7AE5CA", "#A8F0DE",
  "#5B8C7A", "#D4A843", "#6EC4A8", "#C9E4DB",
];

interface Props {
  transactions: Array<{
    amount: number;
    type: string;
    categories: { name: string; color: string | null; icon: string | null } | null;
  }> | undefined;
  isLoading: boolean;
}

export function ExpensesByCategoryChart({ transactions, isLoading }: Props) {
  const { mask } = usePrivacy();
  const chartData = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, { value: number; color: string | null; icon: string | null }>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const name = t.categories?.name || "Sem categoria";
        const existing = map.get(name);
        map.set(name, {
          value: (existing?.value || 0) + Number(t.amount),
          color: existing?.color || t.categories?.color || null,
          icon: existing?.icon || t.categories?.icon || null,
        });
      });
    const sorted = Array.from(map, ([name, { value, color, icon }]) => ({ name, value, color, icon }))
      .sort((a, b) => b.value - a.value);

    // Group beyond 6th into "Outros"
    if (sorted.length > 6) {
      const top = sorted.slice(0, 6);
      const rest = sorted.slice(6);
      const othersValue = rest.reduce((s, d) => s + d.value, 0);
      top.push({ name: "Outros", value: othersValue, color: "#94a3b8", icon: "more-horizontal" });
      return top;
    }
    return sorted;
  }, [transactions]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4 pb-6">
          <Skeleton className="h-48 w-48 rounded-full" />
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
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
                dataKey="value"
                paddingAngle={4}
                cornerRadius={6}
                stroke="none"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Total</span>
            <span className="text-xl font-bold text-foreground mt-0.5">{mask(formatCurrency(total))}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 space-y-3">
          {chartData.map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
            const color = item.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            const IconComponent = resolveCategoryIcon(item.icon);
            return (
              <div key={`${item.name}-${i}`} className="flex items-center gap-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <IconComponent className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <span className="text-xs text-foreground flex-1 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                <span className="text-xs font-bold tabular-nums w-20 text-right text-foreground">{mask(formatCurrency(item.value))}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
