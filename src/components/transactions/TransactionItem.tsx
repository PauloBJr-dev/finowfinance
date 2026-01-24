import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Wallet,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  FileText,
  Ticket,
  Smartphone,
  HelpCircle,
} from "lucide-react";

type Transaction = Tables<"transactions"> & {
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  accounts?: {
    id: string;
    name: string;
    type: string;
  } | null;
  cards?: {
    id: string;
    name: string;
  } | null;
};

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

const paymentMethodIcons: Record<string, React.ElementType> = {
  cash: Banknote,
  debit: Wallet,
  credit_card: CreditCard,
  pix: Smartphone,
  transfer: ArrowRightLeft,
  boleto: FileText,
  voucher: Ticket,
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit_card: "Crédito",
  pix: "Pix",
  transfer: "Transferência",
  boleto: "Boleto",
  voucher: "Voucher",
};

// Mapa de ícones de categoria (simplificado)
const categoryIconMap: Record<string, string> = {
  "shopping-cart": "🛒",
  utensils: "🍽️",
  home: "🏠",
  car: "🚗",
  heart: "❤️",
  "graduation-cap": "🎓",
  gamepad: "🎮",
  plane: "✈️",
  briefcase: "💼",
  "piggy-bank": "🐷",
  gift: "🎁",
  coffee: "☕",
  shirt: "👕",
  smartphone: "📱",
  wifi: "📶",
  zap: "⚡",
  droplet: "💧",
  "more-horizontal": "•••",
};

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const PaymentIcon = paymentMethodIcons[transaction.payment_method] || HelpCircle;
  const isExpense = transaction.type === "expense";
  
  const categoryIcon = transaction.categories?.icon
    ? categoryIconMap[transaction.categories.icon] || "📦"
    : "📦";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50"
    >
      {/* Category Icon */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
        style={{
          backgroundColor: transaction.categories?.color
            ? `${transaction.categories.color}20`
            : "hsl(var(--muted))",
        }}
      >
        {categoryIcon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {transaction.description || transaction.categories?.name || "Transação"}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PaymentIcon className="h-3 w-3" />
          <span>{paymentMethodLabels[transaction.payment_method]}</span>
          {transaction.cards && (
            <span className="truncate">• {transaction.cards.name}</span>
          )}
          {transaction.accounts && (
            <span className="truncate">• {transaction.accounts.name}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div
        className={cn(
          "text-right font-medium",
          isExpense ? "text-destructive" : "text-success"
        )}
      >
        {isExpense ? "-" : "+"}
        {formatCurrency(Number(transaction.amount))}
      </div>
    </button>
  );
}
