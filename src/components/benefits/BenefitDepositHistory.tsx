import { useMemo } from "react";
import { useBenefitDeposits, useDeleteBenefitDeposit, useRestoreBenefitDeposit } from "@/hooks/use-benefit-deposits";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Hash, TrendingUp } from "lucide-react";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { showUndoToast } from "@/components/shared/UndoToast";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";

interface BenefitDepositHistoryProps {
  benefitCard: Tables<"accounts">;
  selectedMonth: string; // YYYY-MM format
}

export function BenefitDepositHistory({ benefitCard, selectedMonth }: BenefitDepositHistoryProps) {
  const { data: deposits = [], isLoading } = useBenefitDeposits(benefitCard.id, selectedMonth);
  const deleteDeposit = useDeleteBenefitDeposit();
  const restoreDeposit = useRestoreBenefitDeposit();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [depositToDelete, setDepositToDelete] = useState<string | null>(null);

  // Calcular totais do mês
  const monthlyStats = useMemo(() => {
    const total = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const avgDailyRate = deposits.length > 0
      ? deposits.reduce((sum, d) => sum + Number(d.daily_rate), 0) / deposits.length
      : 0;
    return { total, avgDailyRate, count: deposits.length };
  }, [deposits]);

  const handleDelete = async () => {
    if (!depositToDelete) return;
    const deletedId = depositToDelete;
    await deleteDeposit.mutateAsync(deletedId);
    setDeleteModalOpen(false);
    setDepositToDelete(null);
    
    showUndoToast({
      message: "Depósito excluído",
      onUndo: () => restoreDeposit.mutateAsync(deletedId),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum depósito neste mês.</p>
        <p className="text-sm mt-1">Clique em "Depositar" para adicionar um crédito.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total do mês</p>
              <p className="font-semibold text-lg">{formatCurrency(monthlyStats.total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Depósitos</p>
              <p className="font-semibold text-lg">{monthlyStats.count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média/dia</p>
              <p className="font-semibold text-lg">{formatCurrency(monthlyStats.avgDailyRate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit list */}
      <div className="space-y-2">
        {deposits.map((deposit) => (
          <Card key={deposit.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg text-primary">
                      +{formatCurrency(Number(deposit.amount))}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {formatCurrency(Number(deposit.daily_rate))}/dia
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(deposit.date))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {deposit.working_days} dias
                    </span>
                  </div>
                  
                  {deposit.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {deposit.description}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setDepositToDelete(deposit.id);
                    setDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirmation */}
      <DeleteConfirmation
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="Excluir depósito?"
        description="O valor será removido do saldo do cartão. Esta ação pode ser desfeita."
        isLoading={deleteDeposit.isPending}
      />
    </div>
  );
}
