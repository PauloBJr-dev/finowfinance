import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { AnimatedBackground } from "./AnimatedBackground";

interface ClockWidgetProps {
  className?: string;
}

export function ClockWidget({ className }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  // Format date in PT-BR
  const weekday = time.toLocaleDateString('pt-BR', { weekday: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = time.getDate();
  const month = time.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  // Get timezone offset
  const offset = time.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const timezoneSign = offset <= 0 ? '+' : '-';
  const timezone = `UTC${timezoneSign}${offsetHours}`;

  return (
    <AnimatedBackground className={className}>
      <div className="p-6 text-center">
        {/* Clock */}
        <div className="mb-2">
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {hours}
          </span>
          <span className="text-5xl font-bold tracking-tight text-primary animate-pulse-soft">
            :
          </span>
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {minutes}
          </span>
        </div>

        {/* Date */}
        <p className="text-sm text-muted-foreground mb-3">
          {capitalizedWeekday}, {day} {capitalizedMonth}
        </p>

        {/* Location */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>São Paulo, BR</span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-primary">{timezone}</span>
        </div>
      </div>
    </AnimatedBackground>
  );
}
