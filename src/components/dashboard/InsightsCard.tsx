import { useState } from "react";
import { Sparkles, AlertTriangle, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInsights } from "@/hooks/use-ai";
import { cn } from "@/lib/utils";

interface Props {
  startDate: string;
  endDate: string;
}

export function InsightsCard({ startDate, endDate }: Props) {
  const { mutate: generate, isPending, data, error } = useInsights();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Insights de IA
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generate({ startDate, endDate })}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analisando…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Insights
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {!data && !isPending && !error && (
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar Insights" para a IA analisar suas finanças do período.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">
            {(error as Error).message || "Erro ao gerar insights."}
          </p>
        )}

        {data && (
          <div className="space-y-4">
            {/* Summary */}
            <p className="text-sm font-medium">{data.summary}</p>

            {/* Highlights */}
            {data.highlights?.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Destaques
                </p>
                <ul className="space-y-1">
                  {data.highlights.map((h: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">• {h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {data.warnings?.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  Alertas
                </p>
                <ul className="space-y-1">
                  {data.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-destructive/90">⚠ {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {data.tips?.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                  Dicas
                </p>
                <ul className="space-y-1">
                  {data.tips.map((t: string, i: number) => (
                    <li key={i} className="text-sm text-foreground">💡 {t}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data points */}
            {data.data_points?.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Dados: {data.data_points.join(" · ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
