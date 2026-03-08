import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCards } from "@/hooks/use-cards";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface InvoiceSummary {
  id: string;
  card_id: string;
  card_name: string;
  total_amount: number;
  status: string;
  due_date: string;
  closing_date: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  open: {
    label: "Aberta",
    dot: "bg-primary",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  closed: {
    label: "Fechada",
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  overdue: {
    label: "Vencida",
    dot: "bg-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function CurrentInvoicesCard() {
  const { user } = useAuth();
  const { data: cards = [], isLoading: loadingCards } = useCards();
  const { mask } = usePrivacy();

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["current-invoices-summary", user?.id],
    queryFn: async () => {
      if (!user?.id || cards.length === 0) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select("id, card_id, total_amount, status, due_date, closing_date")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .neq("status", "paid")
        .order("closing_date", { ascending: false });

      if (error) throw error;

      // Keep only the most recent unpaid invoice per card
      const byCard = new Map<string, typeof data[number]>();
      for (const inv of data ?? []) {
        if (!byCard.has(inv.card_id)) {
          byCard.set(inv.card_id, inv);
        }
      }

      const cardMap = new Map(cards.map((c) => [c.id, c.name]));

      const result: InvoiceSummary[] = [];
      for (const [cardId, inv] of byCard) {
        const name = cardMap.get(cardId);
        if (!name) continue; // card was deleted
        result.push({
          id: inv.id,
          card_id: cardId,
          card_name: name,
          total_amount: Number(inv.total_amount),
          status: inv.status,
          due_date: inv.due_date,
          closing_date: inv.closing_date,
        });
      }

      return result;
    },
    enabled: !!user?.id && cards.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingCards || loadingInvoices;

  // Hide entirely if no cards
  if (!isLoading && cards.length === 0) return null;
  // Hide if no unpaid invoices
  if (!isLoading && invoices.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <CreditCard className="h-4 w-4 text-accent-foreground" />
          </div>
          <CardTitle className="text-sm font-medium">Faturas Atuais</CardTitle>
        </div>
        <Link
          to="/faturas"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : (
          invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.open;
            return (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {/* Status dot */}
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", cfg.dot)} />

                {/* Card info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {inv.card_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", cfg.badge)}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vence {formatDateShort(inv.due_date)}
                  </p>
                </div>

                {/* Amount */}
                <span className="text-sm font-semibold whitespace-nowrap">
                  {mask(formatCurrency(inv.total_amount))}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
