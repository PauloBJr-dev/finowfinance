import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Tables } from "@/integrations/supabase/types";
import { useEffect, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle } from "lucide-react";

type Card = Tables<"cards">;

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  credit_limit: z.number().min(1, "Limite deve ser maior que zero"),
  billing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
  initial_invoice_month: z.string().optional(),
  create_previous_closed: z.boolean().optional(),
});

export type CardFormData = {
  name: string;
  credit_limit: number;
  billing_day: number;
  due_day: number;
  initial_invoice_month?: string;
  create_previous_closed?: boolean;
};

interface CardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CardFormData) => Promise<void>;
  initialData?: Card;
  isLoading?: boolean;
}

// Gera as opções de mês/ano para seleção (mês atual + 6 meses)
function generateMonthOptions() {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = addMonths(now, i);
    const value = format(date, "yyyy-MM-01"); // Primeiro dia do mês
    const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  
  return options;
}

export function CardForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: CardFormProps) {
  const isEditing = !!initialData;
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      credit_limit: 0,
      billing_day: 1,
      due_day: 10,
      initial_invoice_month: monthOptions[1]?.value, // Próximo mês por padrão
      create_previous_closed: true,
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        credit_limit: Number(initialData.credit_limit),
        billing_day: initialData.billing_day,
        due_day: initialData.due_day,
        // Não mostramos seleção de fatura ao editar
      });
    } else {
      form.reset({
        name: "",
        credit_limit: 0,
        billing_day: 1,
        due_day: 10,
        initial_invoice_month: monthOptions[1]?.value,
        create_previous_closed: true,
      });
    }
  }, [initialData, form, monthOptions]);

  const handleSubmit = async (data: CardFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Editar cartão" : "Novo cartão de crédito"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Atualize as informações do seu cartão."
              : "Adicione um cartão para acompanhar suas faturas."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cartão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Nubank, Itaú Platinum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credit_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de crédito</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billing_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de fechamento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Quando a fatura fecha
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Quando a fatura vence
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seleção de fatura inicial - apenas para novo cartão */}
            {!isEditing && (
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Fatura atual aberta</p>
                    <p className="text-xs text-muted-foreground">
                      Qual é a fatura que está aberta agora neste cartão? Todas as compras serão associadas a ela.
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="initial_invoice_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês da fatura aberta</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {monthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Ex: Se hoje é janeiro e sua fatura de fevereiro está aberta, selecione Fevereiro.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="create_previous_closed"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border bg-background p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Criar fatura anterior como fechada</FormLabel>
                        <FormDescription className="text-xs">
                          Útil se você já tem uma fatura fechada aguardando pagamento
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading
                  ? "Salvando..."
                  : isEditing
                  ? "Salvar alterações"
                  : "Criar cartão"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
