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
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { CategorySelect } from "@/components/shared/CategorySelect";
import { useAccounts } from "@/hooks/use-accounts";
import { useCards } from "@/hooks/use-cards";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useSuggestCategory, useAISettings } from "@/hooks/use-ai";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInstallmentPreview } from "@/lib/installment-utils";
import { cn } from "@/lib/utils";
import { CalendarIcon, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = "expense" | "income";
type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";

// Métodos válidos para receita
const INCOME_PAYMENT_METHODS: PaymentMethod[] = ["transfer", "cash", "debit"];

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
  const [aiSuggestion, setAiSuggestion] = useState<{ category_id: string; category_name: string; confidence: number } | null>(null);
  
  // Step 3: Account/Card + Installments
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<string>("");

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: aiSettings } = useAISettings();
  const createTransaction = useCreateTransaction();
  const suggestCategory = useSuggestCategory();

  // Determina se cartão de crédito é permitido (apenas despesas)
  const isCreditCardAllowed = type === "expense";
  const isCreditCardSelected = paymentMethod === "credit_card";
  
  // Parcelamento: apenas despesa + cartão de crédito
  const canShowInstallment = type === "expense" && isCreditCardSelected;

  // Número de parcelas parseado
  const parsedInstallments = useMemo(() => {
    const num = parseInt(installmentCount);
    return !isNaN(num) && num >= 2 && num <= 48 ? num : 0;
  }, [installmentCount]);

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
      setInstallmentCount("");
      setAiSuggestion(null);
    }
  }, [open]);

  // Quando tipo muda, ajusta método de pagamento se inválido
  useEffect(() => {
    if (type === "income" && !INCOME_PAYMENT_METHODS.includes(paymentMethod)) {
      setPaymentMethod("transfer");
    }
    // Reset parcelamento ao mudar para receita
    if (type === "income") {
      setIsInstallment(false);
      setInstallmentCount("");
      setCardId(null);
    }
    // Reset categoria ao mudar tipo (categorias são diferentes)
    setCategoryId(null);
    setAiSuggestion(null);
  }, [type]);

  // Reset parcelamento quando muda método de pagamento
  useEffect(() => {
    if (paymentMethod !== "credit_card") {
      setIsInstallment(false);
      setInstallmentCount("");
    }
  }, [paymentMethod]);

  // Auto-select first account/card when step 3 loads
  useEffect(() => {
    if (step === 3) {
      if (isCreditCardSelected && cards.length > 0 && !cardId) {
        setCardId(cards[0].id);
      } else if (!isCreditCardSelected && accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
    }
  }, [step, isCreditCardSelected, accounts, cards, accountId, cardId]);

  const canProceedStep1 = amount > 0;
  const canProceedStep2 = categoryId !== null;
  const canProceedStep3 = isCreditCardSelected ? cardId !== null : accountId !== null;

  const handleSubmit = async () => {
    try {
      const finalInstallments = canShowInstallment && isInstallment && parsedInstallments >= 2 
        ? parsedInstallments 
        : undefined;

      await createTransaction.mutateAsync({
        amount,
        type,
        payment_method: paymentMethod,
        date: date.toISOString().split('T')[0],
        description: description || null,
        category_id: categoryId,
        account_id: isCreditCardSelected ? null : accountId,
        card_id: isCreditCardSelected ? cardId : null,
        installments: finalInstallments,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const content = (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 pb-8">
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
          <div className="space-y-4">
            {/* Type Toggle */}
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

            {/* Amount */}
            <div className="space-y-2">
              <Label>{type === "expense" ? "Quanto gastou?" : "Quanto recebeu?"}</Label>
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
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
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
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {/* AI Category Suggestion - apenas para despesas */}
            {aiSettings?.categorization_enabled && type === "expense" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!description && amount <= 0) return;
                      const result = await suggestCategory.mutateAsync({
                        description: description || `Transação de ${formatCurrency(amount)}`,
                        amount,
                        payment_method: paymentMethod,
                      });
                      if (result && !result.fallback) {
                        setAiSuggestion({
                          category_id: result.category_id,
                          category_name: result.category_name,
                          confidence: result.confidence_score,
                        });
                      }
                    }}
                    disabled={suggestCategory.isPending || (!description && amount <= 0)}
                    className="gap-2"
                  >
                    {suggestCategory.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Sugerir categoria
                  </Button>

                  {aiSuggestion && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        setCategoryId(aiSuggestion.category_id);
                        setAiSuggestion(null);
                      }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Sugestão: {aiSuggestion.category_name}
                    </Badge>
                  )}
                </div>
                {aiSuggestion && (
                  <p className="text-xs text-muted-foreground">
                    Clique na sugestão para aplicar
                  </p>
                )}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <CategorySelect
                value={categoryId}
                onChange={setCategoryId}
                type={type}
              />
            </div>

            {/* Payment Method - adapta ao tipo */}
            <div className="space-y-2">
              <Label>{type === "expense" ? "Forma de pagamento" : "Forma de recebimento"}</Label>
              <PaymentMethodSelect
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                transactionType={type}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === "expense" ? "Ex: Mercado, Almoço..." : "Ex: Salário de Janeiro..."}
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
          <div className="space-y-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {isCreditCardSelected && type === "expense" ? (
              <>
                {/* Card Select */}
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select value={cardId || ""} onValueChange={setCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cartão" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
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

                {/* Installments - Apenas para cartão de crédito */}
                {canShowInstallment && (
                  <div className="space-y-3 rounded-lg border bg-card/50 p-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="installment-switch" className="cursor-pointer">
                        Compra parcelada?
                      </Label>
                      <Switch
                        id="installment-switch"
                        checked={isInstallment}
                        onCheckedChange={setIsInstallment}
                      />
                    </div>

                    {isInstallment && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="installment-count">Número de parcelas</Label>
                          <Input
                            id="installment-count"
                            type="number"
                            inputMode="numeric"
                            min={2}
                            max={48}
                            value={installmentCount}
                            onChange={(e) => setInstallmentCount(e.target.value)}
                            placeholder="Ex: 3"
                            className="text-center text-lg font-medium"
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            De 2 a 48 parcelas
                          </p>
                        </div>

                        {/* Preview compacto */}
                        {parsedInstallments >= 2 && (
                          <div className="rounded-lg bg-muted/50 p-3 text-sm text-center">
                            <span className="font-medium text-foreground">
                              {formatInstallmentPreview(amount, parsedInstallments)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Account Select */
              <div className="space-y-2">
                <Label>{type === "expense" ? "Pagar com" : "Receber em"}</Label>
                <Select value={accountId || ""} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
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
              {isInstallment && parsedInstallments >= 2 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcelas</span>
                  <span className="font-medium">{parsedInstallments}x</span>
                </div>
              )}
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
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle>
              {step === 1 && "Nova transação"}
              {step === 2 && (type === "expense" ? "Detalhes da despesa" : "Detalhes da receita")}
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {step === 1 && "Nova transação"}
            {step === 2 && (type === "expense" ? "Detalhes da despesa" : "Detalhes da receita")}
            {step === 3 && "Confirmar"}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
