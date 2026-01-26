import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCreateAccount, useUpdateAccount } from "@/hooks/use-accounts";
import { Loader2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(255, "Descrição muito longa").optional(),
  initial_balance: z.number().min(0, "Saldo não pode ser negativo").default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface BenefitCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCard?: Tables<"accounts"> | null;
}

export function BenefitCardForm({ open, onOpenChange, editingCard }: BenefitCardFormProps) {
  const isMobile = useIsMobile();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isEditing = !!editingCard;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingCard?.name || "",
      description: "",
      initial_balance: editingCard?.initial_balance || 0,
    },
  });

  // Reset form when modal opens/closes or editing card changes
  useState(() => {
    if (open) {
      form.reset({
        name: editingCard?.name || "",
        description: "",
        initial_balance: editingCard?.initial_balance || 0,
      });
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editingCard) {
        await updateAccount.mutateAsync({
          id: editingCard.id,
          name: values.name,
        });
      } else {
        await createAccount.mutateAsync({
          name: values.name,
          type: "benefit_card",
          initial_balance: values.initial_balance,
          track_balance: true,
          include_in_net_worth: false, // Não inclui no patrimônio líquido
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in hook
    }
  };

  const isSubmitting = createAccount.isPending || updateAccount.isPending;

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do cartão</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: VA Sodexo, VR Alelo..."
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                Identifique seu cartão benefício
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="initial_balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo inicial (opcional)</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="R$ 0,00"
                  />
                </FormControl>
                <FormDescription>
                  Saldo atual do seu cartão, se houver
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              "Salvar"
            ) : (
              "Criar cartão"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  const title = isEditing ? "Editar Cartão Benefício" : "Novo Cartão Benefício";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
