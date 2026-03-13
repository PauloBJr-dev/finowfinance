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
        "flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all duration-300 will-change-transform",
        "bg-primary/80 backdrop-blur-xl border border-primary/20",
        "hover:scale-105 hover:bg-primary/90 hover:shadow-xl active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        "animate-fade-up",
        className
      )}
      style={{ boxShadow: "0 6px 24px hsl(var(--primary) / 0.25), 0 2px 8px hsl(var(--primary) / 0.1)" }}
      aria-label="Abrir Mentor IA"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}
