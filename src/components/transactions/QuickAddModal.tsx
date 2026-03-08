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

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { CategorySelect } from "@/components/shared/CategorySelect";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCreateBill } from "@/hooks/use-bills";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";

const INCOME_PAYMENT_METHODS: PaymentMethod[] = ["transfer", "cash", "debit"];

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const isMobile = useIsMobile();
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

  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  const createBill = useCreateBill();

  const isBillFlow = type === "expense" && !isPaid;
  const regularAccounts = accounts.filter(a => a.type !== "benefit_card");

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
    }
  }, [open]);

  useEffect(() => {
    if (type === "income" && !INCOME_PAYMENT_METHODS.includes(paymentMethod)) {
      setPaymentMethod("transfer");
    }
    if (type === "income") {
      setIsPaid(true);
    }
    setCategoryId(null);
  }, [type]);

  useEffect(() => {
    if (step === 3 && regularAccounts.length > 0 && !accountId) {
      setAccountId(regularAccounts[0].id);
    }
  }, [step, regularAccounts, accountId]);

  const canProceedStep1 = amount > 0 && (isPaid || dueDate);
  const canProceedStep2 = categoryId !== null && (!isBillFlow || description.trim().length > 0);
  const canProceedStep3 = accountId !== null;

  const handleSubmit = async () => {
    try {
      if (isBillFlow) {
        await createBill.mutateAsync({
          description: description || "Conta a pagar",
          amount,
          category_id: categoryId!,
          due_date: dueDate.toISOString().split('T')[0],
          is_recurring: isRecurring,
        });
      } else {
        await createTransaction.mutateAsync({
          amount,
          type,
          payment_method: paymentMethod as any,
          date: date.toISOString().split('T')[0],
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
  const isSubmitting = createTransaction.isPending || createBill.isPending;

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

        {/* Step 3: Account */}
        {step === 3 && !isBillFlow && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />Voltar
            </button>

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
      <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
        <DrawerContent className="max-h-[85vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle>{getModalTitle()}</DrawerTitle>
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
