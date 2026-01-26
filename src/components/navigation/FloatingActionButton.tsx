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
        "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200",
        "hover:scale-105 hover:shadow-xl active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        // Desktop: bottom-right corner
        "bottom-8 right-8",
        // Mobile: center bottom, above nav
        "md:bottom-8 md:right-8",
        "max-md:bottom-20 max-md:left-1/2 max-md:-translate-x-1/2",
        className
      )}
      aria-label="Adicionar transação"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
