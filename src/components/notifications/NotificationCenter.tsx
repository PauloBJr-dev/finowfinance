import { useState } from "react";
import { Bell, AlertTriangle, Target, PiggyBank, X, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useReminders,
  useUnreadRemindersCount,
  useMarkReminderRead,
  useDismissReminder,
  useMarkAllRemindersRead,
} from "@/hooks/use-ai";

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  data_points: Record<string, unknown> | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  dismissed_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

function getIconForType(type: string) {
  switch (type) {
    case "anomaly_spending":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "goal_achieved":
    case "goal_at_risk":
      return <Target className="h-4 w-4 text-primary" />;
    case "savings_suggestion":
      return <PiggyBank className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function groupByDate(reminders: Reminder[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups: { label: string; items: Reminder[] }[] = [
    { label: "Hoje", items: [] },
    { label: "Esta semana", items: [] },
    { label: "Anteriores", items: [] },
  ];

  for (const r of reminders) {
    const d = new Date(r.created_at);
    if (d >= todayStart) groups[0].items.push(r);
    else if (d >= weekStart) groups[1].items.push(r);
    else groups[2].items.push(r);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadRemindersCount();
  const { data: reminders = [] } = useReminders(true);
  const markRead = useMarkReminderRead();
  const dismiss = useDismissReminder();
  const markAllRead = useMarkAllRemindersRead();

  const activeReminders = (reminders as Reminder[]).filter(
    (r) => !r.dismissed_at
  );

  const handleClick = (reminder: Reminder) => {
    if (!reminder.is_read) {
      markRead.mutate(reminder.id);
    }

    if (reminder.type === "anomaly_spending" && reminder.related_entity_id) {
      navigate(`/transacoes?highlight=${reminder.related_entity_id}`);
      setOpen(false);
    } else if (
      (reminder.type === "goal_achieved" || reminder.type === "goal_at_risk") &&
      reminder.related_entity_id
    ) {
      navigate("/metas");
      setOpen(false);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismiss.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const groups = groupByDate(activeReminders);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Notificações</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="py-2">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((reminder) => (
                    <div
                      key={reminder.id}
                      onClick={() => handleClick(reminder)}
                      className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                        !reminder.is_read ? "bg-accent/20" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getIconForType(reminder.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-tight ${
                            !reminder.is_read
                              ? "font-semibold text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {reminder.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {reminder.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(reminder.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={(e) => handleDismiss(e, reminder.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
