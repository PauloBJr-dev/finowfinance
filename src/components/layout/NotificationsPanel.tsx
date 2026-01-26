import { useState } from "react";
import { Bell, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReminders, useUnreadRemindersCount, useMarkReminderRead, useDismissReminder } from "@/hooks/use-ai";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  className?: string;
}

export function NotificationsPanel({ className }: NotificationsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: reminders = [], isLoading } = useReminders(true);
  const { data: unreadCount = 0 } = useUnreadRemindersCount();
  const markRead = useMarkReminderRead();
  const dismiss = useDismissReminder();

  const displayedReminders = expanded ? reminders : reminders.slice(0, 3);
  const hasMore = reminders.length > 3;

  const handleMarkAllRead = () => {
    reminders.forEach(reminder => {
      if (!reminder.is_read) {
        markRead.mutate(reminder.id);
      }
    });
  };

  const handleDismissAll = () => {
    reminders.forEach(reminder => {
      dismiss.mutate(reminder.id);
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_due':
      case 'invoice_overdue':
        return '💳';
      case 'bill_due':
      case 'bill_overdue':
        return '📄';
      case 'goal_progress':
        return '🎯';
      default:
        return '🔔';
    }
  };

  return (
    <div className={cn("p-3", className)}>
      {/* Container with accent background */}
      <div className="rounded-xl bg-sidebar-accent p-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Notificações</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {reminders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleDismissAll}
            >
              Limpar tudo
            </Button>
          )}
        </div>

      {/* Notifications List */}
      <ScrollArea className={cn(expanded ? "max-h-64" : "max-h-48")}>
        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : reminders.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação no momento
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {displayedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "group relative flex gap-3 rounded-lg p-3 transition-colors",
                  reminder.is_read
                    ? "bg-muted/30"
                    : "bg-primary-soft hover:bg-primary-soft/80"
                )}
              >
                {/* Icon */}
                <span className="text-lg shrink-0">{getIcon(reminder.type)}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm truncate",
                    reminder.is_read ? "text-muted-foreground" : "text-foreground font-medium"
                  )}>
                    {reminder.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {reminder.message}
                  </p>
                  <p className="text-2xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(reminder.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!reminder.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => markRead.mutate(reminder.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => dismiss.mutate(reminder.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

        {/* Toggle More/Less */}
        {hasMore && (
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Ver mais ({reminders.length - 3})
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
