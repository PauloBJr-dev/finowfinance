import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useInvoices, useInvoice, usePayInvoice } from "@/hooks/use-invoices";
import { useAccounts } from "@/hooks/use-accounts";
import { useCards } from "@/hooks/use-cards";
import { formatCurrency, formatMonth } from "@/lib/format";
import { formatInvoiceStatus, getInvoiceStatusColor } from "@/lib/invoice-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Calendar, Loader2 } from "lucide-react";

export default function Faturas() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAccountId, setPayAccountId] = useState<string | null>(null);

  const { data: cards = [] } = useCards();
  const { data: invoices = [], isLoading } = useInvoices(selectedCardId ? { cardId: selectedCardId } : undefined);
  const { data: invoiceDetails } = useInvoice(selectedInvoiceId);
  const { data: accounts = [] } = useAccounts();
  const payInvoice = usePayInvoice();

  const handlePay = async () => {
    if (!selectedInvoiceId || !payAccountId) return;
    await payInvoice.mutateAsync({ invoiceId: selectedInvoiceId, accountId: payAccountId });
    setPayDialogOpen(false);
    setSelectedInvoiceId(null);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Faturas</h1>
            <p className="text-muted-foreground">Acompanhe suas faturas de cartão.</p>
          </div>
          {cards.length > 0 && (
            <Select value={selectedCardId || "all"} onValueChange={(v) => setSelectedCardId(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os cartões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartões</SelectItem>
                {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhuma fatura</h3>
            <p className="text-sm text-muted-foreground">Cadastre um cartão em Configurações para ver faturas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedInvoiceId(invoice.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{formatMonth(invoice.reference_month)}</CardTitle>
                    <Badge className={getInvoiceStatusColor(invoice.status as "open" | "closed" | "paid")}>{formatInvoiceStatus(invoice.status as "open" | "closed" | "paid")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{(invoice.cards as { name: string })?.name}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(Number(invoice.total_amount))}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Vence em {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invoice Details Dialog */}
        <Dialog open={!!selectedInvoiceId} onOpenChange={(o) => !o && setSelectedInvoiceId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="capitalize">{invoiceDetails && formatMonth(invoiceDetails.reference_month)}</DialogTitle>
            </DialogHeader>
            {invoiceDetails && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold">{formatCurrency(Number(invoiceDetails.total_amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span>{new Date(invoiceDetails.due_date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={getInvoiceStatusColor(invoiceDetails.status as "open" | "closed" | "paid")}>{formatInvoiceStatus(invoiceDetails.status as "open" | "closed" | "paid")}</Badge>
                </div>
                {invoiceDetails.status !== "paid" && (
                  <Button onClick={() => setPayDialogOpen(true)} className="w-full">Pagar Fatura</Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pay Dialog */}
        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Pagar Fatura</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione a conta para débito:</p>
              <Select value={payAccountId || ""} onValueChange={setPayAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.current_balance))})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handlePay} disabled={!payAccountId || payInvoice.isPending}>
                {payInvoice.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pagando...</> : "Confirmar Pagamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
