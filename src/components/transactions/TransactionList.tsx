import { useMemo, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { TransactionItem } from "./TransactionItem";
import { TransactionForm } from "./TransactionForm";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { showUndoToast } from "@/components/shared/UndoToast";
import { useDeleteTransaction, useRestoreTransaction } from "@/hooks/use-transactions";
import { formatDateRelative, isSameDay } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

type Transaction = Tables<"transactions"> & {
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  accounts?: {
    id: string;
    name: string;
    type: string;
  } | null;
  cards?: {
    id: string;
    name: string;
  } | null;
};

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

interface GroupedTransactions {
  label: string;
  date: Date;
  transactions: Transaction[];
}

function groupTransactionsByDate(transactions: Transaction[]): GroupedTransactions[] {
  const groups: Map<string, GroupedTransactions> = new Map();
  const today = new Date();

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const dateKey = txDate.toISOString().split('T')[0];

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        label: formatDateRelative(txDate),
        date: txDate,
        transactions: [],
      });
    }

    groups.get(dateKey)!.transactions.push(tx);
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  
  const deleteTransactionMutation = useDeleteTransaction();
  const restoreTransactionMutation = useRestoreTransaction();

  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions]
  );

  const handleDelete = async () => {
    if (!deleteTransaction) return;
    
    const txId = deleteTransaction.id;
    const txDescription = deleteTransaction.description || "Transação";
    
    await deleteTransactionMutation.mutateAsync(txId);
    setDeleteTransaction(null);
    
    showUndoToast({
      message: `"${txDescription}" excluída`,
      onUndo: () => restoreTransactionMutation.mutate(txId),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-1">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-4xl">📝</div>
        <h3 className="text-lg font-medium">Nenhuma transação</h3>
        <p className="text-sm text-muted-foreground">
          Use o botão + para adicionar sua primeira transação
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {groupedTransactions.map((group) => (
          <div key={group.label} className="space-y-1">
            <h3 className="px-3 text-sm font-medium text-muted-foreground">
              {group.label}
            </h3>
            <div className="rounded-lg border bg-card">
              {group.transactions.map((tx, index) => (
                <div key={tx.id}>
                  {index > 0 && <div className="mx-3 border-t" />}
                  <TransactionItem
                    transaction={tx}
                    onClick={() => setSelectedTransaction(tx)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <TransactionForm
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
        transaction={selectedTransaction}
        onDelete={() => {
          setDeleteTransaction(selectedTransaction);
          setSelectedTransaction(null);
        }}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={!!deleteTransaction}
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
        onConfirm={handleDelete}
        title="Excluir transação"
        description={`A transação "${deleteTransaction?.description || 'sem descrição'}" será excluída.`}
        isLoading={deleteTransactionMutation.isPending}
      />
    </>
  );
}
