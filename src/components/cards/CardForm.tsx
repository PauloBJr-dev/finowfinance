import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import type { Card } from "@/hooks/use-cards";

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  credit_limit: z.number().min(0, "Limite não pode ser negativo"),
  billing_day: z
    .number({ invalid_type_error: "Informe o dia" })
    .int()
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
  due_day: z
    .number({ invalid_type_error: "Informe o dia" })
    .int()
    .min(1, "Mínimo 1")
    .max(31, "Máximo 31"),
});

export type CardFormData = z.infer<typeof cardSchema>;

interface CardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CardFormData) => Promise<void>;
  initialData?: Card;
  isLoading?: boolean;
}

export function CardForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: CardFormProps) {
  const isEditing = !!initialData;

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      credit_limit: 0,
      billing_day: 1,
      due_day: 10,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        credit_limit: Number(initialData.credit_limit) || 0,
        billing_day: initialData.billing_day,
        due_day: initialData.due_day,
      });
    } else {
      form.reset({
        name: "",
        credit_limit: 0,
        billing_day: 1,
        due_day: 10,
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (data: CardFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch {
      // Error handled by parent mutation
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Editar cartão" : "Novo cartão"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Atualize as informações do seu cartão de crédito."
              : "Adicione um cartão de crédito para gerenciar suas faturas."}
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

            <TooltipProvider>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billing_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Dia de fechamento
                        <Tooltip>
                          <TooltipTrigger type="button" tabIndex={-1}>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Dia do mês em que a fatura fecha
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Dia de vencimento
                        <Tooltip>
                          <TooltipTrigger type="button" tabIndex={-1}>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Dia do mês em que a fatura vence para pagamento
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TooltipProvider>

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
