import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { BarChart3 } from "lucide-react";
import {
  differenceInDays,
  parseISO,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
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

  // ≤ 7 days → each day
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

  // 8–60 days → each week
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

  // > 60 days → each month
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
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
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
      // Find the bucket this transaction belongs to
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

  // Summary totals
  const totalIncome = chartData.reduce((s, b) => s + b.income, 0);
  const totalExpenses = chartData.reduce((s, b) => s + b.expenses, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent
          className="flex items-end gap-3 pt-4 pb-6"
          style={{ height: 280 }}
        >
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

  const barSize = chartData.length > 15 ? 8 : chartData.length > 7 ? 14 : 24;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Receitas vs Despesas
        </CardTitle>
        <div className="flex gap-6 mt-2">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Receitas
            </span>
            <p className="text-sm font-bold text-primary">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Despesas
            </span>
            <p className="text-sm font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={2} barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
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
            <Bar
              dataKey="income"
              name="Receitas"
              className="fill-primary"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
              maxBarSize={barSize}
            />
            <Bar
              dataKey="expenses"
              name="Despesas"
              className="fill-destructive"
              fill="hsl(var(--destructive))"
              radius={[3, 3, 0, 0]}
              maxBarSize={barSize}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
