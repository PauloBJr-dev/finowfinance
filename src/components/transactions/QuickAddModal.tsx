import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { CategorySelect } from "@/components/shared/CategorySelect";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCreateBill } from "@/hooks/use-bills";
import { useCards } from "@/hooks/use-cards";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateInvoice } from "@/hooks/use-invoices";
import {
  getTargetInvoiceMonth,
  getInstallmentMonths,
  distributeInstallments,
  formatInvoiceMonth,
} from "@/lib/invoice-cycle";
import { formatCurrency, formatDate, formatDateLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, Loader2, FileText, X, AlertTriangle, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";

const INCOME_PAYMENT_METHODS: PaymentMethod[] = ["transfer", "cash", "debit"];
const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date>(new Date());
  const [isPaid, setIsPaid] = useState(true);

  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [description, setDescription] = useState("");

  const [accountId, setAccountId] = useState<string | null>(null);

  // Credit card states
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const createTransaction = useCreateTransaction();
  const createBill = useCreateBill();

  const isBillFlow = type === "expense" && !isPaid;
  const isCreditCardFlow = paymentMethod === "credit_card" && !isBillFlow;
  const regularAccounts = accounts;

  // Installment preview data
  const installmentPreview = useMemo(() => {
    if (!isCreditCardFlow || installmentCount <= 1 || !selectedCardId) return null;
    const card = cards.find((c) => c.id === selectedCardId);
    if (!card || amount <= 0) return null;

    const months = getInstallmentMonths(card.billing_day, date, installmentCount);
    const amounts = distributeInstallments(amount, installmentCount);
    return { months, amounts };
  }, [isCreditCardFlow, installmentCount, selectedCardId, cards, amount, date]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setType("expense");
      setAmount(0);
      setDate(new Date());
      setIsPaid(true);
      setDueDate(new Date());
      setIsRecurring(false);
      setCategoryId(null);
      setPaymentMethod("transfer");
      setDescription("");
      setAccountId(null);
      setSelectedCardId("");
      setInstallmentCount(1);
      setIsSubmittingCard(false);
    }
  }, [open]);

  // Reset on type change
  useEffect(() => {
    if (type === "income" && !INCOME_PAYMENT_METHODS.includes(paymentMethod)) {
      setPaymentMethod("transfer");
    }
    if (type === "income") {
      setIsPaid(true);
    }
    setCategoryId(null);
  }, [type]);

  // Reset card fields when payment method changes away from credit_card
  useEffect(() => {
    if (paymentMethod !== "credit_card") {
      setSelectedCardId("");
      setInstallmentCount(1);
    }
  }, [paymentMethod]);

  const canProceedStep1 = amount > 0 && (isPaid || dueDate);
  const canProceedStep2 = (() => {
    if (categoryId === null) return false;
    if (isBillFlow && description.trim().length === 0) return false;
    if (isCreditCardFlow && !selectedCardId) return false;
    return true;
  })();
  const canProceedStep3 = isCreditCardFlow ? !!selectedCardId : accountId !== null;

  const handleCreditCardSubmit = async () => {
    if (!user?.id) return;
    const card = cards.find((c) => c.id === selectedCardId);
    if (!card) return;

    setIsSubmittingCard(true);
    try {
      const selectedDate = formatDateLocal(date);

      if (installmentCount === 1) {
        const targetMonth = getTargetInvoiceMonth(card.billing_day, date);
        const invoiceId = await getOrCreateInvoice(selectedCardId, user.id, targetMonth);

        if (!invoiceId) {
          toast.error("Erro ao localizar fatura. Tente novamente.");
          return;
        }

        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          type: "expense" as const,
          amount,
          payment_method: "credit_card" as const,
          card_id: selectedCardId,
          invoice_id: invoiceId,
          account_id: null,
          date: selectedDate,
          description: description || null,
          category_id: categoryId,
        });

        if (error) {
          toast.error("Erro ao criar transação.");
          return;
        }
      } else {
        // Parcelado
        const months = getInstallmentMonths(card.billing_day, date, installmentCount);
        const amounts = distributeInstallments(amount, installmentCount);

        // Step 1: main transaction
        const { data: mainTx, error: txError } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            type: "expense" as const,
            amount,
            payment_method: "credit_card" as const,
            card_id: selectedCardId,
            invoice_id: null,
            account_id: null,
            date: selectedDate,
            description: description || null,
            category_id: categoryId,
          })
          .select()
          .single();

        if (txError || !mainTx) {
          toast.error("Erro ao criar transação.");
          return;
        }

        // Step 2: installment_group
        const { data: group, error: groupError } = await supabase
          .from("installment_groups")
          .insert({
            user_id: user.id,
            transaction_id: mainTx.id,
            total_amount: amount,
            total_installments: installmentCount,
          })
          .select()
          .single();

        if (groupError || !group) {
          toast.error("Erro ao criar parcelamento.");
          return;
        }

        // Step 3: each installment
        for (let i = 0; i < installmentCount; i++) {
          const invoiceId = await getOrCreateInvoice(selectedCardId, user.id, months[i]);

          if (!invoiceId) {
            toast.error(`Erro ao localizar fatura da parcela ${i + 1}.`);
            return;
          }

          const { error: installmentError } = await supabase
            .from("installments")
            .insert({
              group_id: group.id,
              invoice_id: invoiceId,
              installment_number: i + 1,
              amount: amounts[i],
              due_date: formatDateLocal(months[i]),
              status: "pending" as const,
            });

          if (installmentError) {
            toast.error(`Erro ao criar parcela ${i + 1}.`);
            return;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      const formattedAmount = formatCurrency(amount);
      if (installmentCount > 1) {
        toast.success(`Compra de ${formattedAmount} em ${installmentCount}x registrada!`);
      } else {
        toast.success(`Despesa de ${formattedAmount} no cartão registrada!`);
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmittingCard(false);
    }
  };

  const handleSubmit = async () => {
    // Credit card flow handled separately
    if (isCreditCardFlow) {
      await handleCreditCardSubmit();
      return;
    }

    try {
      if (isBillFlow) {
        await createBill.mutateAsync({
          description: description || "Conta a pagar",
          amount,
          category_id: categoryId!,
          due_date: formatDateLocal(dueDate),
          is_recurring: isRecurring,
        });
      } else {
        await createTransaction.mutateAsync({
          amount,
          type,
          payment_method: paymentMethod as any,
          date: formatDateLocal(date),
          description: description || null,
          category_id: categoryId,
          account_id: accountId,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const totalSteps = isBillFlow ? 2 : 3;
  const isSubmitting = createTransaction.isPending || createBill.isPending || isSubmittingCard;

  const getModalTitle = () => {
    if (isBillFlow) {
      if (step === 1) return "Nova Conta a Pagar";
      return "Categoria e Descrição";
    }
    if (step === 1) return "Nova transação";
    if (step === 2) return type === "expense" ? "Detalhes da despesa" : "Detalhes da receita";
    return "Confirmar";
  };

  const content = (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 pb-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setType("expense")}
                className={cn(
                  "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
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
                  "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
                  type === "income"
                    ? "bg-success text-success-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Receita
              </button>
            </div>

            <div className="space-y-2">
              <Label>
                {isBillFlow ? "Quanto vai pagar?" : type === "expense" ? "Quanto gastou?" : "Quanto recebeu?"}
              </Label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="R$ 0,00"
                className="text-2xl font-semibold h-14"
              />
            </div>

            {type === "expense" && (
              <div className="rounded-lg border bg-card/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-paid-switch" className="cursor-pointer font-medium">Já paguei</Label>
                    <p className="text-xs text-muted-foreground">
                      {isPaid ? "Despesa já foi paga" : "Criar como conta a pagar"}
                    </p>
                  </div>
                  <Switch id="is-paid-switch" checked={isPaid} onCheckedChange={setIsPaid} />
                </div>
              </div>
            )}

            {isPaid ? (
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, "PPP", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={ptBR} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Data de vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dueDate, "PPP", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} locale={ptBR} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Quando esta conta vence?</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <Label className="font-medium">Esta conta se repete todo mês?</Label>
                  <RadioGroup
                    value={isRecurring ? "recurring" : "single"}
                    onValueChange={(v) => setIsRecurring(v === "recurring")}
                    className="space-y-2"
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="single" id="single" className="mt-0.5" />
                      <Label htmlFor="single" className="cursor-pointer font-normal">Apenas este mês</Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="recurring" id="recurring" className="mt-0.5" />
                      <div>
                        <Label htmlFor="recurring" className="cursor-pointer font-normal">Repetir pelos próximos 6 meses</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Usa a mesma data de vencimento para os próximos meses</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">Continuar</Button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />Voltar
            </button>

            {isBillFlow && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <FileText className="h-4 w-4" />
                <span>Criando conta a pagar (despesa será registrada ao marcar como paga)</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Categoria</Label>
              <CategorySelect value={categoryId} onChange={setCategoryId} type={type} />
            </div>

            {!isBillFlow && (
              <div className="space-y-2">
                <Label>{type === "expense" ? "Forma de pagamento" : "Forma de recebimento"}</Label>
                <PaymentMethodSelect value={paymentMethod} onChange={(v) => setPaymentMethod(v as PaymentMethod)} transactionType={type} />
              </div>
            )}

            {/* Credit card fields */}
            {isCreditCardFlow && (
              <>
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  {cards.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>Nenhum cartão cadastrado. Vá em Configurações → Cartões.</span>
                    </div>
                  ) : (
                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {cards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              {card.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select
                    value={String(installmentCount)}
                    onValueChange={(v) => setInstallmentCount(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {INSTALLMENT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x {n === 1 ? "(à vista)" : `de ${formatCurrency(amount / n)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Installment preview */}
                {installmentPreview && (
                  <div className="rounded-lg border bg-card/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Distribuição das parcelas
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {installmentPreview.amounts.map((amt, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Parcela {i + 1}/{installmentCount} — {formatInvoiceMonth(installmentPreview.months[i])}
                          </span>
                          <span className="font-medium">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span className="font-medium">Total</span>
                      <span className="font-semibold text-foreground">{formatCurrency(amount)} ✓</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>{isBillFlow ? "Nome da conta *" : "Descrição (opcional)"}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder={isBillFlow ? "Ex: Conta de luz, Aluguel..." : type === "expense" ? "Ex: Mercado, Almoço..." : "Ex: Salário de Janeiro..."}
              />
              <div className="flex items-center justify-between">
                {isBillFlow ? (
                  <p className={cn("text-xs", description.trim().length === 0 ? "text-destructive" : "text-muted-foreground")}>
                    {description.trim().length === 0 ? "Obrigatório para contas a pagar" : "Este nome aparecerá na sua lista de contas a pagar"}
                  </p>
                ) : (
                  <span />
                )}
                {description.length > 150 && (
                  <p className="text-xs text-muted-foreground">{description.length}/200</p>
                )}
              </div>
            </div>

            {isBillFlow ? (
              <>
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>{formatDate(dueDate)}</span>
                  </div>
                  {isRecurring && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recorrência</span>
                      <span className="font-medium text-primary">6 meses</span>
                    </div>
                  )}
                </div>
                <Button onClick={handleSubmit} disabled={!canProceedStep2 || isSubmitting} className="w-full">
                  {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : isRecurring ? "Criar 6 contas a pagar" : "Criar conta a pagar"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="w-full">Continuar</Button>
            )}
          </div>
        )}

        {/* Step 3: Account or Credit Card Confirm */}
        {step === 3 && !isBillFlow && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />Voltar
            </button>

            {!isCreditCardFlow && (
              <div className="space-y-2">
                <Label>{type === "expense" ? "Pagar com" : "Receber em"}</Label>
                <Select value={accountId || ""} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {regularAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {regularAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada. Cadastre uma em Configurações.</p>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span className={type === "expense" ? "text-destructive font-medium" : "text-success font-medium"}>
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
              {isCreditCardFlow && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cartão</span>
                    <span className="font-medium">{cards.find((c) => c.id === selectedCardId)?.name}</span>
                  </div>
                  {installmentCount > 1 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Parcelas</span>
                      <span className="font-medium">{installmentCount}x de {formatCurrency(amount / installmentCount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={!canProceedStep3 || isSubmitting} className="w-full">
              {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : "Confirmar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={true}>
        <DrawerContent className="max-h-[85vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DrawerHeader className="flex-shrink-0 relative">
            <DrawerTitle>{getModalTitle()}</DrawerTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getModalTitle()}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
