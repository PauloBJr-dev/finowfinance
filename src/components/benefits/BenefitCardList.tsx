import { useState, useMemo } from "react";
import { useAccounts, useDeleteAccount, useRestoreAccount } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { showUndoToast } from "@/components/shared/UndoToast";
import { BenefitCardForm } from "./BenefitCardForm";
import { BenefitDepositForm } from "./BenefitDepositForm";
import { BenefitDepositHistory } from "./BenefitDepositHistory";
import { 
  Plus,
  Wallet, 
  Edit, 
  Trash2, 
  ArrowDownToLine, 
  ChevronLeft, 
  ChevronRight,
  History 
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function BenefitCardList() {
  const { data: allAccounts = [], isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  const restoreAccount = useRestoreAccount();

  // Filtrar apenas cartões benefício
  const benefitCards = useMemo(
    () => allAccounts.filter((a) => a.type === "benefit_card"),
    [allAccounts]
  );

  // State for modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Tables<"accounts"> | null>(null);
  const [depositFormOpen, setDepositFormOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Tables<"accounts"> | null>(null);
  const [historyCardId, setHistoryCardId] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  

  // Month filter
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  
  const selectedMonthDate = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  const handlePreviousMonth = () => {
    const prev = subMonths(selectedMonthDate, 1);
    setSelectedMonth(format(prev, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const next = addMonths(selectedMonthDate, 1);
    setSelectedMonth(format(next, "yyyy-MM"));
  };

  const handleEdit = (card: Tables<"accounts">) => {
    setEditingCard(card);
    setFormOpen(true);
  };

  const handleDeposit = (card: Tables<"accounts">) => {
    setSelectedCard(card);
    setDepositFormOpen(true);
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    const deletedId = cardToDelete;
    await deleteAccount.mutateAsync(deletedId);
    setDeleteModalOpen(false);
    setCardToDelete(null);
    
    showUndoToast({
      message: "Cartão excluído",
      onUndo: () => restoreAccount.mutateAsync(deletedId),
    });
  };


  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingCard(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Card being viewed for history
  const historyCard = historyCardId 
    ? benefitCards.find((c) => c.id === historyCardId) 
    : null;

  // If viewing history, show history view
  if (historyCard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryCardId(null)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h3 className="font-semibold">{historyCard.name}</h3>
            <p className="text-sm text-muted-foreground">
              Saldo: {formatCurrency(Number(historyCard.current_balance))}
            </p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">
            {format(selectedMonthDate, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <BenefitDepositHistory 
          benefitCard={historyCard} 
          selectedMonth={selectedMonth} 
        />

        <Button
          onClick={() => handleDeposit(historyCard)}
          className="w-full"
        >
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          Depositar
        </Button>

        {selectedCard && (
          <BenefitDepositForm
            open={depositFormOpen}
            onOpenChange={setDepositFormOpen}
            benefitCard={selectedCard}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cartões Benefício</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus vales alimentação e refeição
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cartão
        </Button>
      </div>

      {benefitCards.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum cartão benefício"
          description="Cadastre seu Vale Alimentação ou Vale Refeição para controlar seus gastos."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão Benefício
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {benefitCards.map((card) => (
            <Card key={card.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base font-medium">{card.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Benefício
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-3">
                  {formatCurrency(Number(card.current_balance))}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeposit(card)}
                  >
                    <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                    Depositar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryCardId(card.id)}
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(card)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setCardToDelete(card.id);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <BenefitCardForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editingCard={editingCard}
      />

      {selectedCard && (
        <BenefitDepositForm
          open={depositFormOpen}
          onOpenChange={setDepositFormOpen}
          benefitCard={selectedCard}
        />
      )}

      <DeleteConfirmation
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="Excluir cartão benefício?"
        description="O saldo e histórico de depósitos serão mantidos por 30 dias. Esta ação pode ser desfeita."
        isLoading={deleteAccount.isPending}
      />
    </div>
  );
}
