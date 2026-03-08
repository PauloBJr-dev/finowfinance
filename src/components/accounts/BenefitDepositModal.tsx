import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Tables } from "@/integrations/supabase/types";

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

export function BenefitDepositModal({
  open,
  onOpenChange,
  account,
}: BenefitDepositModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split("T")[0],
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
        date: new Date().toISOString().split("T")[0],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Depositar em {account?.name}</DialogTitle>
          <DialogDescription>
            Registre o crédito mensal do seu vale alimentação/refeição.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 mt-2"
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
                <FormItem>
                  <FormLabel>Data do crédito</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
      </DialogContent>
    </Dialog>
  );
}
