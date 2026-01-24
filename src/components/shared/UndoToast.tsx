import { toast } from "sonner";

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

/**
 * Exibe toast com opção de desfazer (8 segundos por padrão)
 */
export function showUndoToast({
  message,
  onUndo,
  duration = 8000,
}: UndoToastOptions) {
  toast(message, {
    duration,
    action: {
      label: "Desfazer",
      onClick: onUndo,
    },
    classNames: {
      toast: "bg-card border-border",
      title: "text-foreground",
      actionButton: "!bg-primary !text-primary-foreground",
    },
  });
}

/**
 * Toast de exclusão com undo
 */
export function showDeleteToast(itemType: string, onUndo: () => void) {
  showUndoToast({
    message: `${itemType} excluído(a). Desfazer?`,
    onUndo,
  });
}

/**
 * Toast de sucesso simples
 */
export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

/**
 * Toast de erro
 */
export function showErrorToast(message: string) {
  toast.error(message, {
    duration: 5000,
  });
}
