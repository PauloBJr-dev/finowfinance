import { useState } from "react";
import {
  useCards,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
  type Card,
  type CreateCardInput,
} from "@/hooks/use-cards";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { CardForm, type CardFormData } from "./CardForm";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CardList() {
  const { data: cards, isLoading } = useCards();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  const handleCreate = async (data: CardFormData) => {
    const input: CreateCardInput = {
      name: data.name,
      credit_limit: data.credit_limit,
      billing_day: data.billing_day,
      due_day: data.due_day,
    };
    await createCard.mutateAsync(input);
  };

  const handleUpdate = async (data: CardFormData) => {
    if (!editingCard) return;
    await updateCard.mutateAsync({
      id: editingCard.id,
      name: data.name,
      credit_limit: data.credit_limit,
      billing_day: data.billing_day,
      due_day: data.due_day,
    });
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    await deleteCard.mutateAsync(cardToDelete.id);
    setDeleteConfirmOpen(false);
    setCardToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
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
          description="Adicione seu primeiro cartão de crédito para gerenciar suas faturas."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar cartão
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {cards.map((card) => (
              <UICard key={card.id} className="group">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{card.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Fecha dia {card.billing_day} | Vence dia {card.due_day}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-0 pt-2 sm:pt-0 pl-11 sm:pl-0">
                      {card.credit_limit != null && card.credit_limit > 0 && (
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCurrency(Number(card.credit_limit))}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingCard(card)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCardToDelete(card);
                              setDeleteConfirmOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </UICard>
            ))}
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
        description="Faturas associadas a este cartão também serão removidas."
        itemName={cardToDelete?.name}
        isLoading={deleteCard.isPending}
      />
    </div>
  );
}
