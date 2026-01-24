import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  isLoading?: boolean;
}

/**
 * Bottom Sheet de confirmação de exclusão
 * Requer checkbox "Eu entendo" antes de permitir exclusão
 */
export function DeleteConfirmation({
  open,
  onOpenChange,
  onConfirm,
  title = "Excluir item",
  description = "Esta ação não pode ser desfeita.",
  itemName,
  isLoading = false,
}: DeleteConfirmationProps) {
  const [understood, setUnderstood] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUnderstood(false);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (understood) {
      onConfirm();
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              {itemName ? (
                <>
                  Você está prestes a excluir <strong>"{itemName}"</strong>.{" "}
                  {description}
                </>
              ) : (
                description
              )}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4">
            <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 cursor-pointer hover:bg-muted/80 transition-colors">
              <Checkbox
                id="understand"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <span className="text-sm text-muted-foreground">
                Eu entendo que esta ação não pode ser desfeita
              </span>
            </label>
          </div>

          <DrawerFooter className="pb-safe">
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!understood || isLoading}
              className="w-full"
            >
              {isLoading ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
