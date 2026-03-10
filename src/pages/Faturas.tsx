import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCards } from "@/hooks/use-cards";
import { useInvoices, useInvoiceDetails, usePayInvoice, Invoice } from "@/hooks/use-invoices";
import { useAccounts } from "@/hooks/use-accounts";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatInvoiceMonth, formatCyclePeriod } from "@/lib/invoice-cycle";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Receipt, CreditCard, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Wallet, Loader2, X, FileText } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceTransactionItem } from "@/components/invoices/InvoiceTransactionItem";
import { InvoiceInstallmentGroup } from "@/components/invoices/InvoiceInstallmentGroup";

/* ─── Status badge helpers ─── */
const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-primary/15 text-primary border-primary/30" },
  closed: { label: "Fechada", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  paid: { label: "Paga", className: "bg-muted text-muted-foreground border-border" },
};

/* ─── Invoice Content (transactions + installments) ─── */
function InvoiceContent({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading } = useInvoiceDetails(invoiceId);

  if (isLoading) return <div className="space-y-2 py-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  const transactions = data?.transactions ?? [];
  const installments = data?.installments ?? [];

  if (!transactions.length && !installments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Sem lançamentos</p>
        <p className="text-xs text-muted-foreground mt-1">Nenhuma transação neste período.</p>
      </div>
    );
  }

  // Group installments by group_id
  const installmentsByGroup = new Map<string, any[]>();
  for (const inst of installments) {
    const gid = inst.group_id;
    if (!installmentsByGroup.has(gid)) installmentsByGroup.set(gid, []);
    installmentsByGroup.get(gid)!.push(inst);
  }

  // Build unified list for ordering
  type ListItem =
    | { kind: "tx"; date: string; data: any }
    | { kind: "group"; date: string; groupId: string; installments: any[] };

  const items: ListItem[] = [];

  // Direct transactions (not in installment groups)
  for (const tx of transactions) {
    items.push({ kind: "tx", date: tx.date, data: tx });
  }

  // Installment groups
  for (const [groupId, insts] of installmentsByGroup) {
    const firstInst = insts[0];
    const parentDate = firstInst.installment_groups?.transactions?.date || firstInst.due_date;
    items.push({ kind: "group", date: parentDate, groupId, installments: insts });
  }

  // Sort by date desc
  items.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        if (item.kind === "tx") {
          const tx = item.data;
          return (
            <InvoiceTransactionItem
              key={tx.id}
              description={tx.description}
              amount={tx.amount}
              date={tx.date}
              category={tx.categories}
              isLast={isLast}
            />
          );
        }

        // Installment group
        const insts = item.installments;
        const group = insts[0].installment_groups;
        const parentTx = group?.transactions;
        const firstInstNumber = Math.min(...insts.map((i: any) => i.installment_number));

        return (
          <InvoiceInstallmentGroup
            key={item.groupId}
            description={parentTx?.description || "Parcela"}
            category={parentTx?.categories}
            currentInstallmentNumber={firstInstNumber}
            totalInstallments={group?.total_installments ?? 0}
            groupTotal={insts.reduce((s: number, i: any) => s + Number(i.amount), 0)}
            installments={insts.map((i: any) => ({
              id: i.id,
              installment_number: i.installment_number,
              amount: i.amount,
              due_date: i.due_date,
            }))}
            isLast={isLast}
          />
        );
      })}
    </div>
  );
}

/* ─── Pay Invoice Modal (Drawer on mobile, Dialog on desktop) ─── */
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
  const isMobile = useIsMobile();
  const { data: accounts } = useAccounts();
  const { data: details } = useInvoiceDetails(invoice?.id ?? null);
  const computedTotal = details?.computedTotal ?? invoice?.total_amount ?? 0;
  const payMutation = usePayInvoice();
  const [accountId, setAccountId] = useState("");
  const [payDate, setPayDate] = useState<Date>(new Date());

  const bankAccounts = accounts?.filter((a) => a.type !== "benefit_card") ?? [];

  const handleConfirm = () => {
    if (!invoice || !accountId) return;
    payMutation.mutate(
      { invoice, accountId, paymentDate: payDate.toISOString().split("T")[0], cardName, computedTotal },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const content = (
    <div className="flex flex-col gap-4 p-4">
      {invoice && (
        <>
          <div className="rounded-lg border bg-muted/30 p-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Total da fatura — {cardName}</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(computedTotal)}</p>
          </div>

          <div className="space-y-2">
            <Label>Conta para débito</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(payDate, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={payDate}
                  onSelect={(d) => d && setPayDate(d)}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              O valor total será debitado da conta selecionada. Pagamentos parciais não são permitidos.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!accountId || payMutation.isPending || computedTotal <= 0}
              className="flex-1"
            >
              {payMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando…</>
              ) : (
                "Confirmar Pagamento"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="relative">
            <DrawerTitle>Pagar Fatura</DrawerTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </button>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
          <DialogDescription>
            Pagamento integral da fatura do {cardName}.
          </DialogDescription>
        </DialogHeader>
        {content}
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

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // When invoices load or card changes, find the invoice for the current month, or closest open
  useEffect(() => {
    if (!invoices?.length) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Try to find invoice matching current month (invoices sorted DESC by closing_date)
    const currentMonthIdx = invoices.findIndex((inv) => {
      const d = new Date(inv.closing_date + "T12:00:00");
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    if (currentMonthIdx >= 0) {
      setSelectedIndex(currentMonthIdx);
      return;
    }

    // Fallback: closest open invoice to today
    const openInvoices = invoices
      .map((inv, idx) => ({ inv, idx }))
      .filter(({ inv }) => inv.status === "open");
    if (openInvoices.length) {
      const closest = openInvoices.reduce((best, cur) => {
        const bestDiff = Math.abs(new Date(best.inv.closing_date).getTime() - now.getTime());
        const curDiff = Math.abs(new Date(cur.inv.closing_date).getTime() - now.getTime());
        return curDiff < bestDiff ? cur : best;
      });
      setSelectedIndex(closest.idx);
      return;
    }

    // Last fallback: most recent (index 0 since DESC)
    setSelectedIndex(0);
  }, [invoices]);

  // Reset when card changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeCardId]);

  const currentInvoice = invoices?.[selectedIndex] ?? null;
  const { data: details } = useInvoiceDetails(currentInvoice?.id ?? null);
  const computedTotal = details?.computedTotal ?? currentInvoice?.total_amount ?? 0;

  const hasCards = !!cards?.length;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex < (invoices?.length ?? 0) - 1;

  const status = currentInvoice ? (statusConfig[currentInvoice.status] ?? statusConfig.open) : null;
  const canPay = currentInvoice && currentInvoice.status !== "paid" && computedTotal > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="pr-12">
            <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
            <p className="text-muted-foreground">Acompanhe suas faturas de cartão.</p>
          </div>
          <div className="absolute right-0 top-0">
            <NotificationCenter />
          </div>
        </div>

        {/* Card selector or empty state */}
        {cardsLoading ? (
          <Skeleton className="h-10 w-full sm:w-64" />
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
            {/* Card selector */}
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-muted-foreground shrink-0" />
              <Select
                value={activeCardId ?? ""}
                onValueChange={(v) => setSelectedCardId(v)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards!.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monthly navigator */}
            {invoicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : invoices?.length ? (
              <>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasPrev}
                    onClick={() => setSelectedIndex((i) => i + 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-base font-semibold capitalize">
                    {currentInvoice
                      ? formatInvoiceMonth(new Date(currentInvoice.closing_date + "T12:00:00"))
                      : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasNext}
                    onClick={() => setSelectedIndex((i) => i - 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Invoice card — always expanded */}
                {currentInvoice && (
                  <UICard className={currentInvoice.status === "open" ? "border-l-4 border-l-primary" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base capitalize">
                            {formatInvoiceMonth(new Date(currentInvoice.closing_date + "T12:00:00"))}
                          </CardTitle>
                          {status && (
                            <Badge variant="outline" className={status.className}>
                              {status.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {/* Summary row */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {formatCyclePeriod(
                            new Date(currentInvoice.cycle_start_date + "T12:00:00"),
                            new Date(currentInvoice.cycle_end_date + "T12:00:00")
                          )}
                        </span>
                        <span>Vence: {formatDate(currentInvoice.due_date)}</span>
                      </div>

                      {/* Value + Pay button */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-xl font-semibold tabular-nums">{formatCurrency(computedTotal)}</span>
                        {canPay && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={() => setPayingInvoice(currentInvoice)}
                          >
                            Pagar Fatura
                          </Button>
                        )}
                      </div>

                      {/* Transaction list */}
                      <div className="pt-2 border-t border-border">
                        <InvoiceContent invoiceId={currentInvoice.id} />
                      </div>
                    </CardContent>
                  </UICard>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Receipt className="h-7 w-7 text-muted-foreground" />}
                title="Nenhuma fatura encontrada"
                description="Não há faturas para este cartão ainda."
              />
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
