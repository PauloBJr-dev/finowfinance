import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Account = Tables<"accounts">;

const depositSchema = z.object({
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().optional(),
});

type DepositFormData = z.infer<typeof depositSchema>;

interface BenefitDepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

function DepositForm({
  account,
  onOpenChange,
}: {
  account: Account | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 0,
      date: formatDateLocal(new Date()),
      description: "",
    },
  });

  const handleSubmit = async (data: DepositFormData) => {
    if (!account) return;
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("benefit_deposits").insert({
        user_id: user.id,
        account_id: account.id,
        amount: data.amount,
        date: data.date,
        description: data.description || null,
        working_days: 22,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["accounts"] });

      const newBalance = Number(account.current_balance) + data.amount;
      toast.success(
        `${formatCurrency(data.amount)} creditados em ${account.name}. Saldo: ${formatCurrency(newBalance)}`
      );

      form.reset({
        amount: 0,
        date: formatDateLocal(new Date()),
        description: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao depositar:", error);
      toast.error("Erro ao registrar depósito. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDate = form.watch("date")
    ? new Date(form.watch("date") + "T12:00:00")
    : undefined;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 mt-2 px-4 pb-4 sm:px-0 sm:pb-0"
      >
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor do depósito</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data do crédito</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })
                        : "Selecione a data"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(format(date, "yyyy-MM-dd"));
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Crédito março 2026"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Depositar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function BenefitDepositModal({
  open,
  onOpenChange,
  account,
}: BenefitDepositModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <DrawerTitle>Depositar em {account?.name}</DrawerTitle>
            <DrawerDescription>
              Registre o crédito mensal do seu vale alimentação/refeição.
            </DrawerDescription>
          </DrawerHeader>
          <DepositForm account={account} onOpenChange={onOpenChange} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Depositar em {account?.name}</DialogTitle>
          <DialogDescription>
            Registre o crédito mensal do seu vale alimentação/refeição.
          </DialogDescription>
        </DialogHeader>
        <DepositForm account={account} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
