import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick?: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 will-change-transform",
        "hover:scale-105 hover:shadow-xl active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "animate-fade-up",
        className
      )}
      style={{ boxShadow: "0 8px 24px hsl(var(--primary) / 0.25)" }}
      aria-label="Adicionar transação"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
