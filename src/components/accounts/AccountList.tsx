import { useState } from "react";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useRestoreAccount } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteConfirmation } from "@/components/shared/DeleteConfirmation";
import { showDeleteToast } from "@/components/shared/UndoToast";
import { AccountForm, AccountFormData } from "./AccountForm";
import { BenefitDepositModal } from "./BenefitDepositModal";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Plus,
  Wallet,
  Building2,
  CreditCard,
  Ticket,
  PiggyBank,
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
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type AccountType = "checking" | "savings" | "cash" | "investment" | "benefit_card";

const accountTypeConfig: Record<
  AccountType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  checking: { label: "Conta Corrente", icon: Building2, color: "text-primary" },
  savings: { label: "Poupança", icon: PiggyBank, color: "text-success" },
  cash: { label: "Dinheiro", icon: Wallet, color: "text-accent" },
  investment: { label: "Investimento", icon: CreditCard, color: "text-warning" },
  benefit_card: { label: "Vale", icon: Ticket, color: "text-primary" },
};

export function AccountList() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const restoreAccount = useRestoreAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleCreate = async (data: AccountFormData) => {
    await createAccount.mutateAsync(data);
  };

  const handleUpdate = async (data: AccountFormData) => {
    if (!editingAccount) return;
    await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    const accountName = accountToDelete.name;
    const accountId = accountToDelete.id;
    
    await deleteAccount.mutateAsync(accountId);
    setDeleteConfirmOpen(false);
    setAccountToDelete(null);
    
    showDeleteToast("Conta", () => {
      restoreAccount.mutate(accountId);
    });
  };

  const openDeleteConfirm = (account: Account) => {
    setAccountToDelete(account);
    setDeleteConfirmOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
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

  const totalBalance = accounts
    ?.filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Resumo do patrimônio */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Patrimônio líquido</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Lista de contas */}
      {!accounts?.length ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma conta cadastrada"
          description="Adicione suas contas bancárias, carteiras e vales para acompanhar seu saldo."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar conta
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {accounts.map((account) => {
              const config = accountTypeConfig[account.type as AccountType] || accountTypeConfig.checking;
              const Icon = config.icon;

              return (
                <Card key={account.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.name}</span>
                            {account.type === "benefit_card" && (
                              <Badge variant="secondary" className="text-xs">
                                Vale
                              </Badge>
                            )}
                            {!account.include_in_net_worth && (
                              <Badge variant="outline" className="text-xs">
                                Oculto
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            Number(account.current_balance) >= 0
                              ? "text-foreground"
                              : "text-destructive"
                          )}
                        >
                          {formatCurrency(Number(account.current_balance))}
                        </span>
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
                            <DropdownMenuItem onClick={() => openEdit(account)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteConfirm(account)}
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
                </Card>
              );
            })}
          </div>

          <Button onClick={() => setFormOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar conta
          </Button>
        </>
      )}

      {/* Form para criar */}
      <AccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isLoading={createAccount.isPending}
      />

      {/* Form para editar */}
      <AccountForm
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onSubmit={handleUpdate}
        initialData={editingAccount || undefined}
        isLoading={updateAccount.isPending}
      />

      {/* Confirmação de exclusão */}
      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Excluir conta"
        description="Transações associadas a esta conta não serão excluídas, mas perderão a referência."
        itemName={accountToDelete?.name}
        isLoading={deleteAccount.isPending}
      />
    </div>
  );
}
