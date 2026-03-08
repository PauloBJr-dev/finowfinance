import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { useBillsSummary } from "@/hooks/use-bills";
import { useUpcomingBills, usePreviousMonthTotals } from "@/hooks/use-dashboard-data";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency, getGreeting, getFirstName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wallet, UtensilsCrossed, Scale } from "lucide-react";
import { RemindersCard } from "@/components/dashboard/RemindersCard";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { UpcomingBillsCard } from "@/components/dashboard/UpcomingBillsCard";
import { MonthFlowCard } from "@/components/dashboard/MonthFlowCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { MicroInsightCard } from "@/components/dashboard/MicroInsightCard";
import { KpiComparisonBadge } from "@/components/dashboard/KpiComparisonBadge";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Dashboard() {
  const now = useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState({
    startDate: toDateStr(startOfMonth(now)),
    endDate: toDateStr(endOfMonth(now)),
  });

  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: billsSummary } = useBillsSummary(now);
  const { data: upcomingBills, isLoading: loadingUpcoming } = useUpcomingBills();
  const { data: prevMonth } = usePreviousMonthTotals(dateRange.startDate, dateRange.endDate);

  const netWorth = accounts
    .filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const benefitAccounts = accounts.filter(
    (a) => a.type === "benefit_card" && !a.deleted_at
  );
  const benefitBalance = benefitAccounts.reduce(
    (sum, a) => sum + Number(a.current_balance),
    0
  );
  const hasBenefit = benefitAccounts.length > 0;

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expenses;

  const pendingBills = (billsSummary?.pending || 0) + (billsSummary?.overdue || 0);

  const firstName = profile?.name ? getFirstName(profile.name) : "";
  const greeting = getGreeting();

  const handlePeriodChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">Seu resumo financeiro.</p>
        </div>

        {/* Period Filter */}
        <PeriodFilter onPeriodChange={handlePeriodChange} />

        {/* Micro Insight */}
        <MicroInsightCard
          income={income}
          expenses={expenses}
          prevExpenses={prevMonth?.expenses ?? null}
          transactions={transactions}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {/* Saldo Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>
              )}
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(expenses)}
                  </p>
                  <KpiComparisonBadge
                    current={expenses}
                    previous={prevMonth?.expenses ?? null}
                    invertColor
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Receitas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(income)}
                  </p>
                  <KpiComparisonBadge
                    current={income}
                    previous={prevMonth?.income ?? null}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Balanço do Mês */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balanço</CardTitle>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                balance >= 0 ? "bg-primary/15" : "bg-destructive/15"
              )}>
                <Scale className={cn("h-4 w-4", balance >= 0 ? "text-primary" : "text-destructive")} />
              </div>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className={cn(
                    "text-2xl font-bold",
                    balance >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {formatCurrency(balance)}
                  </p>
                  <KpiComparisonBadge
                    current={balance}
                    previous={prevMonth?.balance ?? null}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Vale Refeição (condicional) */}
          {hasBenefit && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Vale Refeição</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15">
                  <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingAccounts ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold text-orange-500">
                    {formatCurrency(benefitBalance)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Month Flow Card */}
        <MonthFlowCard
          income={income}
          expenses={expenses}
          pendingBills={pendingBills}
          isLoading={loadingTx}
        />

        <RemindersCard />

        {/* Charts + Upcoming bills + Recent Transactions */}
        <div className="grid gap-4 md:grid-cols-2">
          <ExpensesByCategoryChart
            transactions={transactions}
            isLoading={loadingTx}
          />
          <UpcomingBillsCard bills={upcomingBills} isLoading={loadingUpcoming} />
        </div>

        {/* Recent Transactions */}
        <RecentTransactionsCard />
      </div>
    </MainLayout>
  );
}
