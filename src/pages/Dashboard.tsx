import { MainLayout } from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/use-accounts";
import { useMonthlyTransactions } from "@/hooks/use-transactions";
import { useInvoices } from "@/hooks/use-invoices";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency, getGreeting, getFirstName, formatMonth } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingDown, TrendingUp, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RemindersCard } from "@/components/dashboard/RemindersCard";

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: transactions = [], isLoading: loadingTx } = useMonthlyTransactions();
  const { data: invoices = [] } = useInvoices({ status: "open" });

  const netWorth = accounts.filter(a => a.include_in_net_worth).reduce((sum, a) => sum + Number(a.current_balance), 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const currentInvoice = invoices[0];

  const firstName = profile?.name ? getFirstName(profile.name) : "";
  const greeting = getGreeting();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="text-muted-foreground">Seu resumo financeiro do mês.</p>
        </div>

        {/* Reminders - Discreto no topo */}
        <RemindersCard />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingAccounts ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {loadingTx ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold text-destructive">{formatCurrency(expenses)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingTx ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold text-primary">{formatCurrency(income)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Fatura Atual</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {currentInvoice ? (
                <Link to="/faturas" className="block">
                  <p className="text-2xl font-bold">{formatCurrency(Number(currentInvoice.total_amount))}</p>
                  <p className="text-xs text-muted-foreground capitalize">{formatMonth(currentInvoice.reference_month)}</p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma fatura aberta</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button asChild><Link to="/transacoes"><Plus className="mr-2 h-4 w-4" />Ver transações</Link></Button>
          <Button variant="outline" asChild><Link to="/configuracoes">Configurações</Link></Button>
        </div>
      </div>
    </MainLayout>
  );
}
