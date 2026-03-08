import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { CategorySelect } from "@/components/shared/CategorySelect";
import { useAccounts } from "@/hooks/use-accounts";

import { useUpdateTransaction } from "@/hooks/use-transactions";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Transaction = Tables<"transactions">;
type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onDelete?: () => void;
}

export function TransactionForm({ open, onOpenChange, transaction, onDelete }: TransactionFormProps) {
  const isMobile = useIsMobile();
  
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const { data: accounts = [] } = useAccounts();
  const updateTransaction = useUpdateTransaction();

  // Load transaction data
  useEffect(() => {
    if (transaction) {
      setType(transaction.type as TransactionType);
      setAmount(Number(transaction.amount));
      setDate(new Date(transaction.date));
      setCategoryId(transaction.category_id);
      setPaymentMethod(transaction.payment_method as PaymentMethod);
      setDescription(transaction.description || "");
      setAccountId(transaction.account_id);
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction) return;

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        type,
        amount,
        date: date.toISOString().split('T')[0],
        category_id: categoryId,
        payment_method: paymentMethod,
        description: description || null,
        account_id: accountId,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const content = (
    <div className="flex flex-col gap-4 px-4 py-2">
      {/* Type Toggle */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-1">
        <button
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            type === "expense"
              ? "bg-destructive text-destructive-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          Despesa
        </button>
        <button
          onClick={() => setType("income")}
          className={cn(
            "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            type === "income"
              ? "bg-success text-success-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          Receita
        </button>
      </div>

      {/* Amount + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Valor</Label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="R$ 0,00"
            className="text-base font-semibold h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 text-sm"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {format(date, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Category + Account row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Categoria</Label>
          <CategorySelect
            value={categoryId}
            onChange={setCategoryId}
            type={type}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Conta</Label>
          <Select value={accountId || ""} onValueChange={setAccountId}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label className="text-xs">Forma de pagamento</Label>
        <PaymentMethodSelect
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          transactionType={type}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Descrição</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Mercado, Almoço..."
          className="h-10"
        />
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-2 px-4 py-3">
      {onDelete && (
        <Button
          variant="outline"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <Button
        onClick={handleSubmit}
        disabled={updateTransaction.isPending || amount <= 0}
        className="flex-1"
      >
        {updateTransaction.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          "Salvar alterações"
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
        <DrawerContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DrawerHeader className="pb-0">
            <DrawerTitle>Editar transação</DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {content}
          </div>
          <DrawerFooter className="pt-0">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {content}
        </div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
