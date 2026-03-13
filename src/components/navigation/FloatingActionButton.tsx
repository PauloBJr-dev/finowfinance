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
        "flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all duration-300 will-change-transform",
        "bg-primary/80 backdrop-blur-xl border border-primary/20",
        "hover:scale-105 hover:bg-primary/90 hover:shadow-xl active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        "animate-fade-up",
        className
      )}
      style={{ boxShadow: "0 6px 24px hsl(var(--primary) / 0.25), 0 2px 8px hsl(var(--primary) / 0.1)" }}
      aria-label="Adicionar transação"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
