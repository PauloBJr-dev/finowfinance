import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/use-accounts";
import { useMonthlyTransactions } from "@/hooks/use-transactions";
import { useBillsSummary } from "@/hooks/use-bills";
import { useSixMonthTransactions, useUpcomingBills } from "@/hooks/use-dashboard-data";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency, getGreeting, getFirstName } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { RemindersCard } from "@/components/dashboard/RemindersCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { IncomeVsExpensesChart } from "@/components/dashboard/IncomeVsExpensesChart";
import { MonthFlowCard } from "@/components/dashboard/MonthFlowCard";
import { UpcomingBillsCard } from "@/components/dashboard/UpcomingBillsCard";

export default function Dashboard() {
  const currentMonth = useMemo(() => new Date(), []);
  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: transactions = [], isLoading: loadingTx } = useMonthlyTransactions();
  const { data: sixMonthTx, isLoading: loading6m } = useSixMonthTransactions();
  const { data: billsSummary, isLoading: loadingBills } = useBillsSummary(currentMonth);
  const { data: upcomingBills, isLoading: loadingUpcoming } = useUpcomingBills();

  const netWorth = accounts
    .filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingBills = (billsSummary?.pending || 0) + (billsSummary?.overdue || 0);

  const firstName = profile?.name ? getFirstName(profile.name) : "";
  const greeting = getGreeting();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">Seu resumo financeiro do mês.</p>
        </div>

        {/* Row 1: Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
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

        {/* Ver transações button */}
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link to="/transacoes">
              Ver transações <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <RemindersCard />


        {/* Row 3: Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <ExpensesByCategoryChart
            transactions={transactions}
            isLoading={loadingTx}
          />
          <IncomeVsExpensesChart
            transactions={sixMonthTx}
            isLoading={loading6m}
          />
        </div>

        {/* Row 4: Upcoming bills */}
        <UpcomingBillsCard bills={upcomingBills} isLoading={loadingUpcoming} />
      </div>
    </MainLayout>
  );
}
