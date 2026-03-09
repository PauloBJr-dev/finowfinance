import { memo } from "react";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resolveCategoryIcon, resolvePaymentMethodIcon, paymentMethodLabels } from "@/lib/category-icons";
import { HelpCircle } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";

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

export const TransactionItem = memo(function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const { mask } = usePrivacy();
  const PaymentIcon = resolvePaymentMethodIcon(transaction.payment_method);
  const isExpense = transaction.type === "expense";

  const categoryColor = transaction.categories?.color || "hsl(var(--muted-foreground))";
  const CategoryIcon = resolveCategoryIcon(transaction.categories?.icon);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-3 min-h-[48px] text-left transition-colors hover:bg-muted/50"
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
        {mask(formatCurrency(Number(transaction.amount)))}
      </div>
    </button>
  );
});
