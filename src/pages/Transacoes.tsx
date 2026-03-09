import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { useTransactions } from "@/hooks/use-transactions";
import { startOfMonth, endOfMonth } from "date-fns";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

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

  const { data: transactions = [], isLoading } = useTransactions(filters);

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

        <TransactionFilters filters={filters} onFiltersChange={setFilters} />
        
        <TransactionList transactions={transactions} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
}
