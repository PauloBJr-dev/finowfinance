import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentMethodSelect } from "@/components/shared/PaymentMethodSelect";
import { useAccounts } from "@/hooks/use-accounts";
import { usePayBill, Bill } from "@/hooks/use-bills";
import { formatCurrency, formatDateLocal } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

interface PayBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill;
  onSuccess: () => void;
}

export function PayBillModal({ open, onOpenChange, bill, onSuccess }: PayBillModalProps) {
  const isMobile = useIsMobile();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [accountId, setAccountId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  const { data: accounts = [] } = useAccounts();
  const payBill = usePayBill();

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const canSubmit = paymentMethod && accountId && paymentDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    await payBill.mutateAsync({
      bill_id: bill.id,
      payment_method: paymentMethod,
      account_id: accountId,
      payment_date: formatDateLocal(paymentDate),
    });

    onSuccess();
  };

  const content = (
    <div className="flex flex-col gap-4 p-4">
      {/* Bill Summary */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
        <h3 className="font-medium">{bill.description}</h3>
        <p className="text-2xl font-bold text-foreground">{formatCurrency(bill.amount)}</p>
        <p className="text-sm text-muted-foreground">
          Vencimento: {format(parseISO(bill.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <PaymentMethodSelect
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          transactionType="expense"
        />
      </div>

      {/* Account Select */}
      <div className="space-y-2">
        <Label>Pagar com</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma conta" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {accounts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta cadastrada. Cadastre uma em Configurações.
          </p>
        )}
      </div>

      {/* Payment Date */}
      <div className="space-y-2">
        <Label>Data do pagamento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(paymentDate, "PPP", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="single"
              selected={paymentDate}
              onSelect={(d) => d && setPaymentDate(d)}
              locale={ptBR}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || payBill.isPending}
          className="flex-1"
        >
          {payBill.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Pagando...
            </>
          ) : (
            "Confirmar Pagamento"
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-xl p-0">
          <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-2">
            <SheetTitle>Pagar Conta</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagar Conta</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
