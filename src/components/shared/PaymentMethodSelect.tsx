import { useState, useMemo } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Wallet,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  FileText,
  Ticket,
  Banknote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type PaymentMethod = "cash" | "debit" | "credit_card" | "transfer" | "boleto" | "voucher" | "split";
type TransactionType = "expense" | "income";

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  transactionType?: TransactionType;
  className?: string;
  disabled?: boolean;
}

const expensePrimaryMethods: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "transfer", label: "Pix/TED", icon: Smartphone },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit_card", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
];

const expenseSecondaryMethods: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "voucher", label: "Voucher", icon: Ticket },
  { value: "split", label: "Dividido", icon: ArrowLeftRight },
];

const incomeMethods: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "transfer", label: "Pix/TED", icon: Smartphone },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "debit", label: "Depósito", icon: CreditCard },
];

const allExpenseMethods = [...expensePrimaryMethods, ...expenseSecondaryMethods];

export function PaymentMethodSelect({ value, onChange, transactionType = "expense", className, disabled = false }: PaymentMethodSelectProps) {
  const isIncome = transactionType === "income";
  const [showMore, setShowMore] = useState(() => !isIncome && expenseSecondaryMethods.some(m => m.value === value));

  const visibleMethods = useMemo(() => {
    if (isIncome) return incomeMethods;
    return showMore ? allExpenseMethods : expensePrimaryMethods;
  }, [isIncome, showMore]);

  const isValueValid = visibleMethods.some(m => m.value === value) || 
    (isIncome ? incomeMethods : allExpenseMethods).some(m => m.value === value);

  return (
    <div className={cn("space-y-2", className)}>
      <RadioGroup value={isValueValid ? value : undefined} onValueChange={(v) => onChange(v as PaymentMethod)} className="grid grid-cols-2 sm:grid-cols-3 gap-2" disabled={disabled}>
        {visibleMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = value === method.value;
          return (
            <div key={method.value}>
              <RadioGroupItem value={method.value} id={`payment-${method.value}`} className="peer sr-only" />
              <Label
                htmlFor={`payment-${method.value}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 p-2.5 sm:p-3 cursor-pointer transition-all hover:bg-muted/50",
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 mb-1", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] sm:text-xs font-medium text-center", isSelected ? "text-primary" : "text-foreground")}>{method.label}</span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {!isIncome && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowMore(!showMore)} className="w-full text-xs text-muted-foreground hover:text-foreground gap-1">
          {showMore ? (<><ChevronUp className="h-3 w-3" />Menos opções</>) : (<><ChevronDown className="h-3 w-3" />Outras formas</>)}
        </Button>
      )}
    </div>
  );
}

export function getPaymentMethodDisplay(method: PaymentMethod) {
  const found = [...allExpenseMethods, ...incomeMethods].find((m) => m.value === method);
  return found || { label: method, icon: Wallet };
}
