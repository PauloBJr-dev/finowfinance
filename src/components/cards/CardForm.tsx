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
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

type Card = Tables<"cards">;

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  credit_limit: z.number().min(1, "Limite deve ser maior que zero"),
  billing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
});

export type CardFormData = {
  name: string;
  credit_limit: number;
  billing_day: number;
  due_day: number;
};



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

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        credit_limit: Number(initialData.credit_limit),
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
    await onSubmit(data);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
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
