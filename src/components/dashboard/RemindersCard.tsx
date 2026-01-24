import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, CreditCard, AlertTriangle, ChevronRight } from "lucide-react";
import { useReminders, useDismissReminder, useMarkReminderRead } from "@/hooks/use-ai";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function RemindersCard() {
  const { data: reminders, isLoading } = useReminders(true); // Incluir lidos
  const dismissReminder = useDismissReminder();
  const markRead = useMarkReminderRead();
  const navigate = useNavigate();

  // Mostrar apenas reminders não dispensados e não expirados
  const activeReminders = reminders?.filter(r => {
    if (r.dismissed_at) return false;
    if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
    return true;
  }).slice(0, 3) || []; // Limitar a 3 reminders

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (activeReminders.length === 0) {
    return null; // Não mostrar card se não houver reminders
  }

  const handleReminderClick = (reminder: typeof activeReminders[0]) => {
    // Marcar como lido
    if (!reminder.is_read) {
      markRead.mutate(reminder.id);
    }
    
    // Navegar para a entidade relacionada
    if (reminder.related_entity_type === 'invoice') {
      navigate('/faturas');
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'invoice_due':
        return <CreditCard className="h-4 w-4" />;
      case 'invoice_overdue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'invoice_overdue':
        return 'destructive';
      case 'invoice_due':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Lembretes
          {activeReminders.filter(r => !r.is_read).length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeReminders.filter(r => !r.is_read).length} novo(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeReminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group
              ${reminder.is_read ? 'bg-muted/30' : 'bg-muted/50 border border-primary/10'}
              hover:bg-muted`}
            onClick={() => handleReminderClick(reminder)}
          >
            <div className={`p-1.5 rounded-full 
              ${reminder.type === 'invoice_overdue' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
            >
              {getReminderIcon(reminder.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${reminder.is_read ? 'text-muted-foreground' : ''}`}>
                  {reminder.title}
                </p>
                {!reminder.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {reminder.message}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissReminder.mutate(reminder.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
