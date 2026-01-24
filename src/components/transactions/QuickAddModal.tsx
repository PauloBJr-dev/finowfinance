import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { CategorySelect } from "@/components/shared/CategorySelect";
import { useAccounts } from "@/hooks/use-accounts";
import { useCards } from "@/hooks/use-cards";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInstallmentPreview } from "@/lib/installment-utils";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  
  // Step 1: Type, Amount, Date
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date>(new Date());
  
  // Step 2: Category, Payment Method, Description
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [description, setDescription] = useState("");
  
  // Step 3: Account/Card + Installments
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const createTransaction = useCreateTransaction();

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setType("expense");
      setAmount(0);
      setDate(new Date());
      setCategoryId(null);
      setPaymentMethod("transfer");
      setDescription("");
      setAccountId(null);
      setCardId(null);
      setIsInstallment(false);
      setInstallments(2);
    }
  }, [open]);

  // Auto-select first account/card when step 3 loads
  useEffect(() => {
    if (step === 3) {
      if (paymentMethod === "credit_card" && cards.length > 0 && !cardId) {
        setCardId(cards[0].id);
      } else if (paymentMethod !== "credit_card" && accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [step, paymentMethod, accounts, cards, accountId, cardId]);

  const canProceedStep1 = amount > 0;
  const canProceedStep2 = categoryId !== null;
  const canProceedStep3 = paymentMethod === "credit_card" ? cardId !== null : accountId !== null;

  const handleSubmit = async () => {
    try {
      await createTransaction.mutateAsync({
        amount,
        type,
        payment_method: paymentMethod,
        date: date.toISOString().split('T')[0],
        description: description || null,
        category_id: categoryId,
        account_id: paymentMethod === "credit_card" ? null : accountId,
        card_id: paymentMethod === "credit_card" ? cardId : null,
        installments: paymentMethod === "credit_card" && isInstallment ? installments : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const content = (
    <div className="flex flex-col gap-6 p-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 w-8 rounded-full transition-colors",
              s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step 1: Type, Amount, Date */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Type Toggle */}
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-1">
            <button
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                type === "expense"
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Despesa
            </button>
            <button
              onClick={() => setType("income")}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                type === "income"
                  ? "bg-success/10 text-success"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Receita
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor</Label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="R$ 0,00"
              className="text-2xl font-semibold h-14"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP", { locale: ptBR })}
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

          <Button
            onClick={() => setStep(2)}
            disabled={!canProceedStep1}
            className="w-full"
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Step 2: Category, Payment Method, Description */}
      {step === 2 && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              type={type}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <PaymentMethodSelect
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado, Almoço..."
            />
          </div>

          <Button
            onClick={() => setStep(3)}
            disabled={!canProceedStep2}
            className="w-full"
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Step 3: Account/Card + Installments */}
      {step === 3 && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          {paymentMethod === "credit_card" ? (
            <>
              {/* Card Select */}
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
                {cards.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum cartão cadastrado. Cadastre um em Configurações.
                  </p>
                )}
              </div>

              {/* Installments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="installment-switch">É parcelado?</Label>
                  <Switch
                    id="installment-switch"
                    checked={isInstallment}
                    onCheckedChange={setIsInstallment}
                  />
                </div>

                {isInstallment && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Número de parcelas</Label>
                      <Select
                        value={installments.toString()}
                        onValueChange={(v) => setInstallments(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Preview compacto */}
                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      {formatInstallmentPreview(amount, installments)}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Account Select */
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
              {accounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta cadastrada. Cadastre uma em Configurações.
                </p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <span className={type === "expense" ? "text-destructive" : "text-success"}>
                {type === "expense" ? "Despesa" : "Receita"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data</span>
              <span>{formatDate(date)}</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canProceedStep3 || createTransaction.isPending}
            className="w-full"
          >
            {createTransaction.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {step === 1 && "Nova transação"}
              {step === 2 && "Detalhes"}
              {step === 3 && "Confirmar"}
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Nova transação"}
            {step === 2 && "Detalhes"}
            {step === 3 && "Confirmar"}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
