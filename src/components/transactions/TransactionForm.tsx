import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
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
import { useCards } from "@/hooks/use-cards";
import { useUpdateTransaction } from "@/hooks/use-transactions";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { formatDateLocal } from "@/lib/format";
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
  const [cardId, setCardId] = useState<string | null>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const updateTransaction = useUpdateTransaction();

  useEffect(() => {
    if (transaction) {
      setType(transaction.type as TransactionType);
      setAmount(Number(transaction.amount));
      const [year, month, day] = transaction.date.split('-').map(Number);
      setDate(new Date(year, month - 1, day));
      setCategoryId(transaction.category_id);
      setPaymentMethod(transaction.payment_method as PaymentMethod);
      setDescription(transaction.description || "");
      if (transaction.payment_method === 'credit_card') {
        setCardId(transaction.card_id);
        setAccountId(null);
      } else {
        setAccountId(transaction.account_id);
        setCardId(null);
      }
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction) return;
    const isCredit = paymentMethod === "credit_card";
    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        _originalTransaction: {
          date: transaction.date,
          card_id: transaction.card_id,
          invoice_id: transaction.invoice_id,
        },
        type,
        amount,
        date: formatDateLocal(date),
        category_id: categoryId,
        payment_method: paymentMethod,
        description: description || null,
        account_id: isCredit ? null : accountId,
        card_id: isCredit ? cardId : null,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const content = (
    <div className="flex flex-col gap-6 p-4">
      {/* Type Toggle */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-1">
        <button
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            type === "expense" ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Despesa
        </button>
        <button
          onClick={() => setType("income")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            type === "income" ? "bg-success/10 text-success" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Receita
        </button>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label>Valor</Label>
        <CurrencyInput value={amount} onChange={setAmount} placeholder="R$ 0,00" className="text-xl font-semibold h-12" />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>Data</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "PPP", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={ptBR} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <CategorySelect value={categoryId} onChange={setCategoryId} type={type} />
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <PaymentMethodSelect
          value={paymentMethod}
          onChange={(v) => {
            setPaymentMethod(v as PaymentMethod);
            if (v !== 'credit_card') setCardId(null);
            else setAccountId(null);
          }}
          transactionType={type}
        />
      </div>

      {/* Card or Account selector */}
      {paymentMethod === "credit_card" ? (
        <div className="space-y-2">
          <Label>Cartão</Label>
          <Select value={cardId || ""} onValueChange={setCardId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cartão" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Conta</Label>
          <Select value={accountId || ""} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conta" />
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
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado, Almoço..." />
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-2 p-4">
      {onDelete && (
        <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <Button onClick={handleSubmit} disabled={updateTransaction.isPending || amount <= 0} className="flex-1">
        {updateTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Editar transação</DrawerTitle>
          </DrawerHeader>
          {content}
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
