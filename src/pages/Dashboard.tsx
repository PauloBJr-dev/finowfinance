import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { useBillsSummary } from "@/hooks/use-bills";
import { useUpcomingBills } from "@/hooks/use-dashboard-data";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency, getGreeting, getFirstName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, ArrowRight, Wallet, UtensilsCrossed } from "lucide-react";
import { RemindersCard } from "@/components/dashboard/RemindersCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { UpcomingBillsCard } from "@/components/dashboard/UpcomingBillsCard";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { startOfMonth, endOfMonth } from "date-fns";

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

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <span className="text-[10px] text-muted-foreground font-normal">(hoje)</span>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(expenses)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(income)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ver transações */}
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link to="/transacoes">
              Ver transações <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <RemindersCard />

        {/* Charts + Upcoming bills */}
        <div className="grid gap-4 md:grid-cols-2">
          <ExpensesByCategoryChart
            transactions={transactions}
            isLoading={loadingTx}
          />
          <UpcomingBillsCard bills={upcomingBills} isLoading={loadingUpcoming} />
        </div>

      </div>
    </MainLayout>
  );
}
