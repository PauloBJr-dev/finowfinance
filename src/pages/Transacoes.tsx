import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { useTransactions } from "@/hooks/use-transactions";
import { startOfMonth, endOfMonth } from "date-fns";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { MonthNavigator } from "@/components/shared/MonthNavigator";

export default function Transacoes() {
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    type?: "expense" | "income";
    categoryId?: string;
    accountId?: string;
    cardId?: string;
  }>({
    startDate: startOfMonth(new Date()).toISOString().split('T')[0],
    endDate: endOfMonth(new Date()).toISOString().split('T')[0],
  });

  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions = [], isLoading } = useTransactions(filters);

  const paymentMethodLabels: Record<string, string> = {
    cash: "dinheiro",
    debit: "débito",
    transfer: "transferência",
    boleto: "boleto",
    credit_card: "cartão de crédito",
    voucher: "vale",
    split: "parcelado",
    pix: "pix",
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t: any) => {
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchValue = String(t.amount).replace(".", ",").includes(q);
      const methodLabel = paymentMethodLabels[t.payment_method] || t.payment_method;
      const matchMethod = methodLabel.toLowerCase().includes(q);
      const matchCategory = t.categories?.name?.toLowerCase().includes(q);
      const matchAccount = t.accounts?.name?.toLowerCase().includes(q);
      return matchDesc || matchValue || matchMethod || matchCategory || matchAccount;
    });
  }, [transactions, searchQuery]);

  const handlePeriodChange = (startDate: string, endDate: string) => {
    setFilters((prev) => ({ ...prev, startDate, endDate }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="relative">
          <div className="pr-12">
            <h1 className="text-2xl font-semibold">Transações</h1>
            <p className="text-muted-foreground">Suas movimentações financeiras.</p>
          </div>
          <div className="absolute right-0 top-0">
            <NotificationCenter />
          </div>
        </div>

        <MonthNavigator onPeriodChange={handlePeriodChange} />

        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <TransactionList transactions={filteredTransactions} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
