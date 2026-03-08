import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import {
  differenceInDays,
  parseISO,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  endOfWeek,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  transactions:
    | Array<{
        amount: number;
        type: string;
        date: string;
      }>
    | undefined;
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
}

type Bucket = {
  key: string;
  label: string;
  from: Date;
  to: Date;
  income: number;
  expenses: number;
};

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function buildBuckets(startDate: string, endDate: string): Bucket[] {
  const from = parseISO(startDate);
  const to = parseISO(endDate);
  const days = differenceInDays(to, from) + 1;

  if (days <= 7) {
    return eachDayOfInterval({ start: from, end: to }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE, dd", { locale: ptBR }),
      from: d,
      to: d,
      income: 0,
      expenses: 0,
    }));
  }

  if (days <= 60) {
    const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
    return weeks.map((weekStart) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return {
        key: format(weekStart, "yyyy-'W'II"),
        label: `${format(weekStart, "dd/MM")} – ${format(wEnd, "dd/MM")}`,
        from: weekStart,
        to: wEnd,
        income: 0,
        expenses: 0,
      };
    });
  }

  return eachMonthOfInterval({ start: from, end: to }).map((mStart) => {
    const mEnd = endOfMonth(mStart);
    return {
      key: format(mStart, "yyyy-MM"),
      label: format(mStart, "MMM/yy", { locale: ptBR }),
      from: mStart,
      to: mEnd,
      income: 0,
      expenses: 0,
    };
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-popover/90 backdrop-blur-md px-4 py-3 shadow-lg text-popover-foreground">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function IncomeVsExpensesChart({
  transactions,
  isLoading,
  startDate,
  endDate,
}: Props) {
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const buckets = buildBuckets(startDate, endDate);

    transactions?.forEach((t) => {
      const tDate = parseISO(t.date);
      for (const bucket of buckets) {
        if (
          isWithinInterval(tDate, { start: bucket.from, end: bucket.to }) ||
          t.date === format(bucket.from, "yyyy-MM-dd") ||
          t.date === format(bucket.to, "yyyy-MM-dd")
        ) {
          if (t.type === "income") bucket.income += Number(t.amount);
          else bucket.expenses += Number(t.amount);
          break;
        }
      }
    });

    return buckets;
  }, [transactions, startDate, endDate]);

  const totalIncome = chartData.reduce((s, b) => s + b.income, 0);
  const totalExpenses = chartData.reduce((s, b) => s + b.expenses, 0);
  const balance = totalIncome - totalExpenses;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3 pt-4 pb-6" style={{ height: 280 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded"
              style={{ height: `${30 + Math.random() * 50}%` }}
            />
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
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Sem dados para exibir ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Receitas vs Despesas
        </CardTitle>
        <div className="flex items-center gap-6 mt-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
              Receitas
            </span>
            <p className="text-sm font-bold text-primary">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
              Despesas
            </span>
            <p className="text-sm font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {balance >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={`text-xs font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
              {balance >= 0 ? "+" : ""}{formatCurrency(balance)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradientExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/30"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompact}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              name="Receitas"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#gradientIncome)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))" }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Despesas"
              stroke="hsl(var(--destructive))"
              strokeWidth={2.5}
              fill="url(#gradientExpenses)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--destructive))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
