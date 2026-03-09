import { useState, useMemo, useCallback, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { supabase } from "@/integrations/supabase/client";
import { useBillsSummary } from "@/hooks/use-bills";
import { useUpcomingBills, usePreviousMonthTotals } from "@/hooks/use-dashboard-data";
import { useProfile } from "@/hooks/use-profile";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { formatCurrency, getGreeting, getFirstName, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, Wallet, UtensilsCrossed, Scale, Eye, EyeOff } from "lucide-react";
import { RemindersCard } from "@/components/dashboard/RemindersCard";
import { ExpensesByCategoryChart } from "@/components/dashboard/ExpensesByCategoryChart";
import { UpcomingBillsCard } from "@/components/dashboard/UpcomingBillsCard";
import { MonthFlowCard } from "@/components/dashboard/MonthFlowCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { MicroInsightCard } from "@/components/dashboard/MicroInsightCard";
import { KpiComparisonBadge } from "@/components/dashboard/KpiComparisonBadge";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import { CurrentInvoicesCard } from "@/components/dashboard/CurrentInvoicesCard";
import { PeriodFilter } from "@/components/shared/PeriodFilter";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Dashboard() {
  const now = useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState({
    startDate: toDateStr(startOfMonth(now)),
    endDate: toDateStr(endOfMonth(now)),
  });

  const {
    visibleWidgets: w,
    kpiOrder,
    sectionOrder,
    toggleWidget,
    reorderKpis,
    reorderSections,
    resetDefaults,
  } = useDashboardPreferences();
  const { plan } = useAuth();
  const { hidden, toggle, mask } = usePrivacy();

  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: billsSummary } = useBillsSummary(now);
  const { data: upcomingBills, isLoading: loadingUpcoming } = useUpcomingBills();
  const { data: prevMonth } = usePreviousMonthTotals(dateRange.startDate, dateRange.endDate);

  const netWorth = useMemo(() => accounts
    .filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + Number(a.current_balance), 0), [accounts]);

  const benefitAccounts = useMemo(() => accounts.filter(
    (a) => a.type === "benefit_card" && !a.deleted_at
  ), [accounts]);
  const benefitBalance = useMemo(() => benefitAccounts.reduce(
    (sum, a) => sum + Number(a.current_balance), 0
  ), [benefitAccounts]);
  const hasBenefit = benefitAccounts.length > 0;

  const { data: lastDeposit } = useQuery({
    queryKey: ["last-benefit-deposit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefit_deposits")
        .select("date")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: hasBenefit,
    staleTime: 5 * 60 * 1000,
  });

  const expenses = useMemo(() => transactions
    .filter((t) => t.type === "expense" && t.payment_method !== "credit_card")
    .reduce((sum, t) => sum + Number(t.amount), 0), [transactions]);
  const income = useMemo(() => transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0), [transactions]);
  const balance = income - expenses;
  const pendingBills = (billsSummary?.pending || 0) + (billsSummary?.overdue || 0);

  const firstName = profile?.name ? getFirstName(profile.name) : "";
  const greeting = getGreeting();

  const handlePeriodChange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  }, []);

  // ── KPI renderer map ──
  const kpiRenderers: Record<string, () => ReactNode> = {
    kpi_balance: () => (
      <Card key="kpi_balance">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
            <Wallet className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingAccounts ? <Skeleton className="h-8 w-24" /> : (
            <>
              <p className="text-2xl font-bold">{mask(formatCurrency(netWorth))}</p>
              {hasBenefit && <p className="text-xs text-muted-foreground mt-1">Inclui saldo de benefícios</p>}
            </>
          )}
        </CardContent>
      </Card>
    ),
    kpi_expenses: () => (
      <Card key="kpi_expenses">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingTx ? <Skeleton className="h-8 w-24" /> : (
            <>
              <p className="text-2xl font-bold text-destructive">{mask(formatCurrency(expenses))}</p>
              {!hidden && <KpiComparisonBadge current={expenses} previous={prevMonth?.expenses ?? null} invertColor />}
              <p className="text-xs text-muted-foreground mt-1">Não inclui despesas do cartão de crédito</p>
            </>
          )}
        </CardContent>
      </Card>
    ),
    kpi_income: () => (
      <Card key="kpi_income">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingTx ? <Skeleton className="h-8 w-24" /> : (
            <>
              <p className="text-2xl font-bold text-primary">{mask(formatCurrency(income))}</p>
              {!hidden && <KpiComparisonBadge current={income} previous={prevMonth?.income ?? null} />}
            </>
          )}
        </CardContent>
      </Card>
    ),
    kpi_net: () => (
      <Card key="kpi_net">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Balanço</CardTitle>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", balance >= 0 ? "bg-primary/15" : "bg-destructive/15")}>
            <Scale className={cn("h-4 w-4", balance >= 0 ? "text-primary" : "text-destructive")} />
          </div>
        </CardHeader>
        <CardContent>
          {loadingTx ? <Skeleton className="h-8 w-24" /> : (
            <>
              <p className={cn("text-2xl font-bold", balance >= 0 ? "text-primary" : "text-destructive")}>{mask(formatCurrency(balance))}</p>
              {!hidden && <KpiComparisonBadge current={balance} previous={prevMonth?.balance ?? null} />}
            </>
          )}
        </CardContent>
      </Card>
    ),
    kpi_benefit: () => {
      if (!hasBenefit) return null;
      return (
        <Card key="kpi_benefit">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vale Refeição</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? <Skeleton className="h-8 w-24" /> : (
              <>
                <p className="text-2xl font-bold text-orange-500">{mask(formatCurrency(benefitBalance))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {benefitAccounts.length} conta(s) · {lastDeposit?.date
                    ? `Último depósito: ${formatDate(lastDeposit.date)}`
                    : "Nenhum depósito"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      );
    },
  };

  // ── Section renderer map ──
  const sectionRenderers: Record<string, () => ReactNode> = {
    micro_insight: () => (
      <MicroInsightCard
        key="micro_insight"
        income={income}
        expenses={expenses}
        prevExpenses={prevMonth?.expenses ?? null}
        transactions={transactions}
      />
    ),
    month_flow: () => (
      <MonthFlowCard
        key="month_flow"
        income={income}
        expenses={expenses}
        pendingBills={pendingBills}
        isLoading={loadingTx}
      />
    ),
    reminders: () => <RemindersCard key="reminders" />,
    ai_insights: () => (
      <InsightsCard key="ai_insights" startDate={dateRange.startDate} endDate={dateRange.endDate} />
    ),
    current_invoices: () => <CurrentInvoicesCard key="current_invoices" />,
    expenses_chart: () => (
      <ExpensesByCategoryChart key="expenses_chart" transactions={transactions} isLoading={loadingTx} />
    ),
    upcoming_bills: () => (
      <UpcomingBillsCard key="upcoming_bills" bills={upcomingBills} isLoading={loadingUpcoming} />
    ),
    recent_transactions: () => <RecentTransactionsCard key="recent_transactions" />,
  };

  // ── Render sections with intelligent layout ──
  const renderSections = () => {
    const visibleSections = sectionOrder.filter((id) => w[id]);
    const elements: ReactNode[] = [];
    let i = 0;

    while (i < visibleSections.length) {
      const id = visibleSections[i];
      const nextId = visibleSections[i + 1];

      // Group expenses_chart + upcoming_bills side by side if adjacent
      if (
        (id === "expenses_chart" && nextId === "upcoming_bills") ||
        (id === "upcoming_bills" && nextId === "expenses_chart")
      ) {
        elements.push(
          <div key={`grid-${id}-${nextId}`} className="grid gap-4 md:grid-cols-2">
            {sectionRenderers[id]()}
            {sectionRenderers[nextId]()}
          </div>
        );
        i += 2;
      } else {
        elements.push(sectionRenderers[id]());
        i += 1;
      }
    }

    return elements;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative">
          {/* Action icons — top right */}
          <div className="absolute right-0 top-0 flex items-center gap-1">
            <NotificationCenter />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{hidden ? "Mostrar valores" : "Ocultar valores"}</TooltipContent>
            </Tooltip>
            <DashboardCustomizer
              visibleWidgets={w}
              kpiOrder={kpiOrder}
              sectionOrder={sectionOrder}
              toggleWidget={toggleWidget}
              reorderKpis={reorderKpis}
              reorderSections={reorderSections}
              resetDefaults={resetDefaults}
            />
          </div>

          <div className="flex items-center gap-3 pr-28 md:pr-0">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold leading-tight">
                {greeting}{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">Seu resumo financeiro</p>
            </div>
            {plan === "premium" && (
              <Badge className="hidden md:inline-flex bg-primary/15 text-primary border-primary/30 gap-1">
                <Crown className="h-3 w-3" /> Premium
              </Badge>
            )}
            {plan === "lifetime" && (
              <Badge className="hidden md:inline-flex bg-primary/15 text-primary border-primary/30 gap-1">
                <Crown className="h-3 w-3" /> Lifetime
              </Badge>
            )}
          </div>
        </div>

        {/* Period Filter */}
        <PeriodFilter onPeriodChange={handlePeriodChange} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {kpiOrder.filter((id) => w[id]).map((id) => kpiRenderers[id]())}
        </div>

        {/* Sections */}
        {renderSections()}
      </div>
    </MainLayout>
  );
}
