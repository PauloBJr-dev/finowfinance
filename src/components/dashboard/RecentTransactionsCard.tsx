import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { useTransactions } from "@/hooks/use-transactions";
import { Link } from "react-router-dom";
import { ArrowRight, Receipt } from "lucide-react";

export function RecentTransactionsCard() {
  const { data: transactions = [], isLoading } = useTransactions({ limit: 5 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
        <Link
          to="/transacoes"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todas
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {isLoading ? (
          <div className="space-y-3 px-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Receipt className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma transação ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
