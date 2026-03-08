import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Undo2, Trash2 } from "lucide-react";
import { createElement } from "react";

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
    icon: createElement(Undo2, { className: "h-4 w-4 text-[hsl(var(--warning))]" }),
    action: {
      label: "Desfazer",
      onClick: onUndo,
    },
  });
}

/**
 * Toast de exclusão com undo
 */
export function showDeleteToast(itemType: string, onUndo: () => void) {
  toast(
    `${itemType} excluído(a) com sucesso`,
    {
      description: "Você pode desfazer essa ação nos próximos 8 segundos.",
      duration: 8000,
      icon: createElement(Trash2, { className: "h-4 w-4 text-[hsl(var(--destructive))]" }),
      action: {
        label: "Desfazer",
        onClick: onUndo,
      },
    }
  );
}

/**
 * Toast de sucesso com descrição opcional
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    duration: 3000,
    description,
  });
}

/**
 * Toast de erro com descrição opcional
 */
export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    duration: 5000,
    description,
  });
}
