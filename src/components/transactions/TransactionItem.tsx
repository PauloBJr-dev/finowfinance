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
  ShoppingBag,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Heart,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Dumbbell,
  Music,
  TrendingUp,
  Building,
  Users,
  Tag,
  Gamepad2,
  MoreHorizontal,
  Coffee,
  Shirt,
  Wifi,
  Zap,
  Droplet,
  PiggyBank,
  Wrench,
  Laptop,
  PlusCircle,
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
  transfer: "Pix/TED",
  boleto: "Boleto",
  voucher: "Voucher",
};

// Mapa completo de ícones Lucide para categorias
const categoryIconMap: Record<string, React.ElementType> = {
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  utensils: Utensils,
  heart: Heart,
  "heart-pulse": HeartPulse,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  plane: Plane,
  gift: Gift,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  music: Music,
  "trending-up": TrendingUp,
  building: Building,
  users: Users,
  tag: Tag,
  "gamepad-2": Gamepad2,
  gamepad: Gamepad2,
  "more-horizontal": MoreHorizontal,
  coffee: Coffee,
  shirt: Shirt,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  "piggy-bank": PiggyBank,
  wrench: Wrench,
  laptop: Laptop,
  "plus-circle": PlusCircle,
  "credit-card": CreditCard,
  wallet: Wallet,
  Wallet: Wallet,
  // PascalCase fallbacks
  ShoppingBag,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Heart,
  HeartPulse,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  Music,
  TrendingUp,
  Building,
  Users,
  Tag,
  Gamepad2,
  Wrench,
  Laptop,
  PlusCircle,
  CreditCard,
  HelpCircle,
};

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const PaymentIcon = paymentMethodIcons[transaction.payment_method] || HelpCircle;
  const isExpense = transaction.type === "expense";

  const categoryColor = transaction.categories?.color || "hsl(var(--muted-foreground))";
  const CategoryIcon = transaction.categories?.icon
    ? categoryIconMap[transaction.categories.icon] || Tag
    : Tag;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/50"
    >
      {/* Category Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: transaction.categories?.color
            ? `${transaction.categories.color}18`
            : "hsl(var(--muted))",
        }}
      >
        <CategoryIcon
          className="h-5 w-5"
          style={{ color: categoryColor }}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {transaction.description || transaction.categories?.name || "Transação"}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <PaymentIcon className="h-3 w-3 shrink-0" />
          <span>{paymentMethodLabels[transaction.payment_method]}</span>
          {transaction.accounts && (
            <>
              <span className="text-border">•</span>
              <span className="truncate">{transaction.accounts.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div
        className={cn(
          "text-right font-semibold text-sm tabular-nums shrink-0",
          isExpense ? "text-destructive" : "text-success"
        )}
      >
        {isExpense ? "-" : "+"}
        {formatCurrency(Number(transaction.amount))}
      </div>
    </button>
  );
}
