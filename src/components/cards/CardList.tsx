import { useState } from "react";
import { useCards, useCreateCard, useUpdateCard, useDeleteCard, useRestoreCard } from "@/hooks/use-cards";
import { useInvoices } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { showDeleteToast } from "@/components/shared/UndoToast";
import { CardForm, CardFormData } from "./CardForm";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tables } from "@/integrations/supabase/types";

type CreditCard = Tables<"cards">;

export function CardList() {
  const { data: cards, isLoading: cardsLoading } = useCards();
  const { data: invoices } = useInvoices({ status: "open" });
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const restoreCard = useRestoreCard();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  const handleCreate = async (data: CardFormData) => {
    await createCard.mutateAsync(data);
    setFormOpen(false);
  };

  const handleUpdate = async (data: CardFormData) => {
    if (!editingCard) return;
    await updateCard.mutateAsync({ id: editingCard.id, ...data });
    setEditingCard(null);
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    
    const cardId = cardToDelete.id;
    
    await deleteCard.mutateAsync(cardId);
    setDeleteConfirmOpen(false);
    setCardToDelete(null);
    
    showDeleteToast("Cartão", () => {
      restoreCard.mutate(cardId);
    });
  };

  const openDeleteConfirm = (card: CreditCard) => {
    setCardToDelete(card);
    setDeleteConfirmOpen(true);
  };

  const openEdit = (card: CreditCard) => {
    setEditingCard(card);
  };

  // Calcula uso do limite baseado na fatura aberta
  const getCardUsage = (cardId: string) => {
    const cardInvoice = invoices?.find(
      (inv) => inv.card_id === cardId && inv.status === "open"
    );
    return cardInvoice ? Number(cardInvoice.total_amount) : 0;
  };

  if (cardsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!cards?.length ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
          title="Nenhum cartão cadastrado"
          description="Adicione seus cartões de crédito para acompanhar suas faturas."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar cartão
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {cards.map((card) => {
              const usage = getCardUsage(card.id);
              const limit = Number(card.credit_limit);
              const usagePercent = limit > 0 ? (usage / limit) * 100 : 0;
              const available = limit - usage;

              return (
                <Card key={card.id} className="group overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium">{card.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Fecha dia {card.billing_day}
                            </span>
                            <span>Vence dia {card.due_day}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(card)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteConfirm(card)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Fatura atual
                        </span>
                        <span className="font-medium">
                          {formatCurrency(usage)}
                        </span>
                      </div>
                      <Progress
                        value={usagePercent}
                        className={cn(
                          "h-2",
                          usagePercent > 80 && "[&>div]:bg-destructive"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Disponível: {formatCurrency(Math.max(0, available))}
                        </span>
                        <span>Limite: {formatCurrency(limit)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button onClick={() => setFormOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar cartão
          </Button>
        </>
      )}

      {/* Form para criar */}
      <CardForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isLoading={createCard.isPending}
      />

      {/* Form para editar */}
      <CardForm
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSubmit={handleUpdate}
        initialData={editingCard || undefined}
        isLoading={updateCard.isPending}
      />

      {/* Confirmação de exclusão */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Excluir cartão"
        description="Faturas e transações associadas a este cartão não serão excluídas."
        itemName={cardToDelete?.name}
        isLoading={deleteCard.isPending}
      />
    </div>
  );
}
