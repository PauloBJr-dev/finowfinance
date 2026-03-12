import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorFABProps {
  onClick: () => void;
  className?: string;
}

export function MentorFAB({ onClick, className }: MentorFABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 will-change-transform",
        "hover:scale-105 hover:shadow-xl active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "animate-fade-up",
        // Desktop
        "bottom-[5.5rem] right-8",
        // Mobile: above QuickAdd FAB
        "max-md:bottom-[7.5rem] max-md:right-4",
        className
      )}
      style={{ boxShadow: "0 6px 20px hsl(var(--primary) / 0.2)" }}
      aria-label="Abrir Mentor IA"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}
