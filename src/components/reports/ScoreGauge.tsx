import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  value: number;
  level: string;
  className?: string;
}

const levelConfig: Record<string, { label: string; emoji: string; colorClass: string; strokeClass: string }> = {
  excellent: { label: "Saúde excelente", emoji: "🟢", colorClass: "text-emerald-500", strokeClass: "stroke-emerald-500" },
  good: { label: "Saúde boa", emoji: "🟡", colorClass: "text-yellow-500", strokeClass: "stroke-yellow-500" },
  attention: { label: "Atenção necessária", emoji: "🟠", colorClass: "text-orange-500", strokeClass: "stroke-orange-500" },
  critical: { label: "Situação crítica", emoji: "🔴", colorClass: "text-red-500", strokeClass: "stroke-red-500" },
};

export function ScoreGauge({ value, level, className }: ScoreGaugeProps) {
  const config = levelConfig[level] || levelConfig.attention;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" className="stroke-muted/30" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none" strokeWidth="8" strokeLinecap="round"
            className={cn("transition-all duration-1000 ease-out", config.strokeClass)}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", config.colorClass)}>{value}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn("text-sm font-semibold", config.colorClass)}>
          {config.emoji} {config.label}
        </p>
      </div>
    </div>
  );
}
