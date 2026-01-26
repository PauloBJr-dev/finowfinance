import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadRemindersCount } from "@/hooks/use-ai";
import { cn } from "@/lib/utils";

interface RightSidebarTriggerProps {
  onClick: () => void;
  className?: string;
}

export function RightSidebarTrigger({ onClick, className }: RightSidebarTriggerProps) {
  const { data: unreadCount = 0 } = useUnreadRemindersCount();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "fixed top-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card border-border hover:bg-muted",
        className
      )}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
