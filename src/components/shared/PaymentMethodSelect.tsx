import { useState } from "react";
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

type PaymentMethod =
  | "cash"
  | "debit"
  | "credit_card"
  | "transfer"
  | "boleto"
  | "voucher"
  | "split";

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  className?: string;
  disabled?: boolean;
}

const primaryMethods: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "transfer", label: "Pix/TED", icon: Smartphone },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit_card", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
];

const secondaryMethods: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "voucher", label: "Voucher", icon: Ticket },
  { value: "split", label: "Dividido", icon: ArrowLeftRight },
];

const allMethods = [...primaryMethods, ...secondaryMethods];

/**
 * Seletor visual de método de pagamento com opção de expandir métodos secundários
 */
export function PaymentMethodSelect({
  value,
  onChange,
  className,
  disabled = false,
}: PaymentMethodSelectProps) {
  const [showMore, setShowMore] = useState(() => 
    secondaryMethods.some(m => m.value === value)
  );

  const visibleMethods = showMore ? allMethods : primaryMethods;

  return (
    <div className={cn("space-y-2", className)}>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as PaymentMethod)}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        disabled={disabled}
      >
        {visibleMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = value === method.value;

          return (
            <div key={method.value}>
              <RadioGroupItem
                value={method.value}
                id={`payment-${method.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`payment-${method.value}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 p-2.5 sm:p-3 cursor-pointer transition-all",
                  "hover:bg-muted/50",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5 mb-1",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-medium",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {method.label}
                </span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowMore(!showMore)}
        className="w-full text-xs text-muted-foreground hover:text-foreground gap-1"
      >
        {showMore ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Menos opções
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Outras formas
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Retorna ícone e label do método de pagamento
 */
export function getPaymentMethodDisplay(method: PaymentMethod) {
  const found = allMethods.find((m) => m.value === method);
  return found || { label: method, icon: Wallet };
}
