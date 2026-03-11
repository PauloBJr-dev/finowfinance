import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function DeleteConfirmation({
  open,
  onOpenChange,
  onConfirm,
  title = "Excluir item",
  description = "Esta ação não pode ser desfeita.",
  itemName,
  isLoading = false,
}: DeleteConfirmationProps) {
  const isMobile = useIsMobile();
  const [understood, setUnderstood] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setUnderstood(false);
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (understood) onConfirm();
  };

  const icon = (
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
      <AlertTriangle className="h-6 w-6 text-destructive" />
    </div>
  );

  const descriptionContent = itemName ? (
    <>Você está prestes a excluir <strong>"{itemName}"</strong>. {description}</>
  ) : (
    description
  );

  const checkboxBlock = (
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
  );

  const confirmButton = (
    <Button
      variant="destructive"
      onClick={handleConfirm}
      disabled={!understood || isLoading}
      className="w-full"
    >
      {isLoading ? "Excluindo..." : "Confirmar exclusão"}
    </Button>
  );

  const cancelButton = (
    <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
      Cancelar
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-center">
              {icon}
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{descriptionContent}</DrawerDescription>
            </DrawerHeader>
            {checkboxBlock}
            <DrawerFooter className="pb-safe">
              {confirmButton}
              <DrawerClose asChild>{cancelButton}</DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="text-center">
          {icon}
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionContent}</DialogDescription>
        </DialogHeader>
        {checkboxBlock}
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {confirmButton}
          {cancelButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
