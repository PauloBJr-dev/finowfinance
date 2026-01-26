import { useState } from "react";
import { Bill, useBills, useDeleteBill, useRestoreBill, BillStatus } from "@/hooks/use-bills";
import { BillCard } from "./BillCard";
import { BillFilters } from "./BillFilters";
import { PayBillModal } from "./PayBillModal";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { EmptyState } from "@/components/shared/EmptyState";
import { showUndoToast } from "@/components/shared/UndoToast";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export function BillList() {
  const [month, setMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<BillStatus | "all">("pending");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const { data: bills = [], isLoading } = useBills({
    month,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: allBills = [] } = useBills({ month });
  
  const deleteBill = useDeleteBill();
  const restoreBill = useRestoreBill();

  const counts = {
    pending: allBills.filter((b) => b.status === "pending").length,
    overdue: allBills.filter((b) => b.status === "overdue").length,
    paid: allBills.filter((b) => b.status === "paid").length,
    all: allBills.length,
  };

  const handlePay = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPayModal(true);
  };

  const handleDelete = (bill: Bill) => {
    setBillToDelete(bill);
  };

  const confirmDelete = () => {
    if (billToDelete) {
      const deletedBillCopy = { ...billToDelete };
      deleteBill.mutate(billToDelete.id, {
        onSuccess: () => {
          showUndoToast({
            message: `Conta "${deletedBillCopy.description}" removida`,
            onUndo: () => restoreBill.mutate(deletedBillCopy.id),
          });
        },
      });
      setBillToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <BillFilters
          month={month}
          onMonthChange={setMonth}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BillFilters
        month={month}
        onMonthChange={setMonth}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        counts={counts}
      />

      {bills.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-muted-foreground" />}
          title={
            statusFilter === "all"
              ? "Nenhuma conta neste mês"
              : statusFilter === "pending"
              ? "Nenhuma conta a vencer"
              : statusFilter === "overdue"
              ? "Nenhuma conta vencida"
              : "Nenhuma conta paga"
          }
          description={
            statusFilter === "all"
              ? "Adicione suas contas a pagar pelo botão +"
              : "Não há contas com este status no mês selecionado."
          }
        />
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onPay={handlePay}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pay Modal */}
      {selectedBill && (
        <PayBillModal
          open={showPayModal}
          onOpenChange={setShowPayModal}
          bill={selectedBill}
          onSuccess={() => {
            setShowPayModal(false);
            setSelectedBill(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmation
        open={!!billToDelete}
        onOpenChange={(open) => !open && setBillToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir conta a pagar"
        description={`Tem certeza que deseja excluir a conta "${billToDelete?.description}"?`}
      />
    </div>
  );
}
