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
        // Mobile: center bottom, above nav
        "bottom-20 left-1/2 -translate-x-1/2",
        // Tablet: bottom-right (no right sidebar visible)
        "md:bottom-8 md:right-8 md:left-auto md:translate-x-0",
        // Desktop: to the left of right sidebar (sidebar is w-80 = 320px)
        "xl:right-[calc(320px+2rem)]",
        className
      )}
      aria-label="Adicionar transação"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
