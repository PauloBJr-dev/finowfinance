import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Wallet,
  CreditCard,
  Smartphone,
  ArrowLeftRight,
  FileText,
  Ticket,
  Banknote,
} from "lucide-react";

type PaymentMethod =
  | "cash"
  | "debit"
  | "credit_card"
  | "pix"
  | "transfer"
  | "boleto"
  | "voucher";

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  className?: string;
  disabled?: boolean;
}

const paymentMethods: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "pix", label: "Pix", icon: Smartphone },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit_card", label: "Crédito", icon: CreditCard },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "transfer", label: "Transferência", icon: ArrowLeftRight },
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "voucher", label: "Voucher", icon: Ticket },
];

/**
 * Seletor visual de método de pagamento
 */
export function PaymentMethodSelect({
  value,
  onChange,
  className,
  disabled = false,
}: PaymentMethodSelectProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as PaymentMethod)}
      className={cn("grid grid-cols-3 sm:grid-cols-4 gap-2", className)}
      disabled={disabled}
    >
      {paymentMethods.map((method) => {
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
                "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all",
                "hover:bg-muted/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
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
  );
}

/**
 * Retorna ícone e label do método de pagamento
 */
export function getPaymentMethodDisplay(method: PaymentMethod) {
  const found = paymentMethods.find((m) => m.value === method);
  return found || { label: method, icon: Wallet };
}
