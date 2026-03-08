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
import { useEffect } from "react";

type Account = Tables<"accounts">;
type AccountType = "checking" | "savings" | "cash" | "investment" | "benefit_card";

const accountSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  type: z.enum(["checking", "savings", "cash", "investment", "benefit_card"]) as z.ZodType<"checking" | "savings" | "cash" | "investment" | "benefit_card">,
  initial_balance: z.number().min(0, "Saldo não pode ser negativo"),
  include_in_net_worth: z.boolean(),
});

export type AccountFormData = {
  name: string;
  type: "checking" | "savings" | "cash" | "investment" | "benefit_card";
  initial_balance: number;
  include_in_net_worth: boolean;
};



interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  initialData?: Account;
  isLoading?: boolean;
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Investimento" },
  { value: "benefit_card", label: "Vale Alimentação/Refeição" },
];

export function AccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}: AccountFormProps) {
  const isEditing = !!initialData;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      initial_balance: 0,
      include_in_net_worth: true,
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type as AccountType,
        initial_balance: Number(initialData.initial_balance),
        include_in_net_worth: initialData.include_in_net_worth,
      });
    } else {
      form.reset({
        name: "",
        type: "checking",
        initial_balance: 0,
        include_in_net_worth: true,
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (data: AccountFormData) => {
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
            {isEditing ? "Editar conta" : "Nova conta"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Atualize as informações da sua conta."
              : "Adicione uma nova conta para acompanhar seu saldo."}
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
                  <FormLabel>Nome da conta</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Nubank, Carteira, VA Sodexo"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de conta</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEditing ? "Saldo inicial" : "Saldo atual"}
                  </FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? "Saldo inicial quando você cadastrou a conta"
                      : "Qual o saldo atual desta conta?"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="include_in_net_worth"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Incluir no patrimônio
                    </FormLabel>
                    <FormDescription>
                      Soma o saldo desta conta ao seu patrimônio total
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
                  : "Criar conta"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
