import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCreateBenefitDeposit } from "@/hooks/use-benefit-deposits";
import { formatCurrency } from "@/lib/format";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  amount: z.number().positive("Valor deve ser maior que zero"),
  date: z.date(),
  working_days: z.number().int().min(1, "Mínimo 1 dia").max(31, "Máximo 31 dias"),
  description: z.string().max(255, "Descrição muito longa").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BenefitDepositFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benefitCard: Tables<"accounts">;
}

export function BenefitDepositForm({ open, onOpenChange, benefitCard }: BenefitDepositFormProps) {
  const isMobile = useIsMobile();
  const createDeposit = useCreateBenefitDeposit();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      working_days: 22,
      description: "",
    },
  });

  const watchedAmount = form.watch("amount");
  const watchedWorkingDays = form.watch("working_days");

  // Calcular valor por dia
  const dailyRate = useMemo(() => {
    if (watchedAmount > 0 && watchedWorkingDays > 0) {
      return watchedAmount / watchedWorkingDays;
    }
    return 0;
  }, [watchedAmount, watchedWorkingDays]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createDeposit.mutateAsync({
        account_id: benefitCard.id,
        amount: values.amount,
        date: values.date.toISOString().split("T")[0],
        working_days: values.working_days,
        description: values.description || undefined,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        {/* Card name display */}
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-sm text-muted-foreground">Depositar em</p>
          <p className="font-semibold text-lg">{benefitCard.name}</p>
          <p className="text-sm text-muted-foreground">
            Saldo atual: {formatCurrency(Number(benefitCard.current_balance))}
          </p>
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor a creditar</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="R$ 0,00"
                  className="text-xl font-semibold h-12"
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
            <FormItem>
              <FormLabel>Data do depósito</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    locale={ptBR}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="working_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dias úteis trabalhados</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 22)}
                  className="text-center"
                />
              </FormControl>
              <FormDescription>
                Quantos dias úteis você trabalhou neste mês?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Daily rate display */}
        {dailyRate > 0 && (
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <p className="text-sm text-muted-foreground">Valor por dia</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(dailyRate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ({formatCurrency(watchedAmount)} ÷ {watchedWorkingDays} dias)
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Crédito de fevereiro..."
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
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={createDeposit.isPending || watchedAmount <= 0}
          >
            {createDeposit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Depositar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  const title = `Depositar em ${benefitCard.name}`;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
