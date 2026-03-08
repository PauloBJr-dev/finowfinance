import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCards, Card } from "@/hooks/use-cards";
import { useInvoices, useInvoiceTransactions, usePayInvoice, Invoice } from "@/hooks/use-invoices";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInvoiceMonth, formatCyclePeriod } from "@/lib/invoice-cycle";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CreditCard, ChevronDown, ChevronUp, Calendar, AlertTriangle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Status badge helpers ─── */
const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "Fechada", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  paid: { label: "Paga", className: "bg-muted text-muted-foreground border-border" },
};

/* ─── Invoice Transaction List (expanded) ─── */
function InvoiceTransactions({ invoiceId }: { invoiceId: string }) {
  const { data: transactions, isLoading } = useInvoiceTransactions(invoiceId);

  if (isLoading) return <div className="space-y-2 py-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!transactions?.length) return <p className="py-3 text-sm text-muted-foreground text-center">Nenhuma transação nesta fatura.</p>;

  return (
    <div className="divide-y divide-border">
      {transactions.map((tx: any) => (
        <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{tx.description || "Sem descrição"}</span>
            {tx.categories?.name && (
              <Badge variant="outline" className="text-xs shrink-0">{tx.categories.name}</Badge>
            )}
          </div>
          <span className="font-medium tabular-nums shrink-0 ml-3">{formatCurrency(tx.amount)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Invoice Card ─── */
function InvoiceCard({
  invoice,
  cardName,
  onPay,
}: {
  invoice: Invoice;
  cardName: string;
  onPay: (invoice: Invoice) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[invoice.status] ?? statusConfig.open;
  const canPay = invoice.status !== "paid" && invoice.total_amount > 0;

  return (
    <UICard
      className={cn(
        "transition-colors",
        invoice.status === "open" && "border-l-4 border-l-primary"
      )}
    >
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base capitalize">
              {formatInvoiceMonth(new Date(invoice.closing_date + "T12:00:00"))}
            </CardTitle>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Summary row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatCyclePeriod(
              new Date(invoice.cycle_start_date + "T12:00:00"),
              new Date(invoice.cycle_end_date + "T12:00:00")
            )}
          </span>
          <span>Vence: {formatDate(invoice.due_date)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums">{formatCurrency(invoice.total_amount)}</span>
          {canPay && (
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onPay(invoice); }}>
              Pagar Fatura
            </Button>
          )}
        </div>

        {/* Expanded transactions */}
        {expanded && (
          <div className="pt-2 border-t border-border">
            <InvoiceTransactions invoiceId={invoice.id} />
          </div>
        )}
      </CardContent>
    </UICard>
  );
}

/* ─── Pay Invoice Modal ─── */
function PayInvoiceModal({
  invoice,
  cardName,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  cardName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: accounts } = useAccounts();
  const payMutation = usePayInvoice();
  const [accountId, setAccountId] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [payDate, setPayDate] = useState(today);

  const bankAccounts = accounts?.filter((a) => a.type !== "benefit_card") ?? [];

  const handleConfirm = () => {
    if (!invoice || !accountId) return;
    payMutation.mutate(
      { invoice, accountId, paymentDate: payDate, cardName },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
          <DialogDescription>
            Pagamento integral da fatura do {cardName}.
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Total da fatura</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(invoice.total_amount)}</p>
            </div>

            <div className="space-y-2">
              <Label>Conta para débito</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5" /> {acc.name}
                        <span className="text-muted-foreground ml-1">({formatCurrency(acc.current_balance)})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                O valor total será debitado da conta selecionada. Pagamentos parciais não são permitidos.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!accountId || payMutation.isPending}
          >
            {payMutation.isPending ? "Processando…" : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */
export default function Faturas() {
  const navigate = useNavigate();
  const { data: cards, isLoading: cardsLoading } = useCards();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const activeCardId = selectedCardId ?? cards?.[0]?.id ?? null;
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(activeCardId);
  const selectedCard = cards?.find((c) => c.id === activeCardId);

  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const hasCards = !!cards?.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">Acompanhe suas faturas de cartão.</p>
        </div>

        {/* Card selector or empty state */}
        {cardsLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : !hasCards ? (
          <UICard className="p-8 text-center space-y-4">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum cartão cadastrado</p>
              <p className="text-sm text-muted-foreground">
                Vá em Configurações → Cartões para adicionar.
              </p>
            </div>
            <Button onClick={() => navigate("/configuracoes")}>Ir para Configurações</Button>
          </UICard>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <Select
                value={activeCardId ?? ""}
                onValueChange={(v) => setSelectedCardId(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards!.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoices list */}
            {invoicesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : !invoices?.length ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma fatura encontrada para este cartão.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <InvoiceCard
                    key={inv.id}
                    invoice={inv}
                    cardName={selectedCard?.name ?? ""}
                    onPay={setPayingInvoice}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pay modal */}
      <PayInvoiceModal
        invoice={payingInvoice}
        cardName={selectedCard?.name ?? ""}
        open={!!payingInvoice}
        onOpenChange={(o) => { if (!o) setPayingInvoice(null); }}
      />
    </MainLayout>
  );
}
