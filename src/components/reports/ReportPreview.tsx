import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreGauge } from "./ScoreGauge";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus, Info, Lock } from "lucide-react";

export interface ReportPreviewData {
  summary: { totalIncome: number; totalExpenses: number; balance: number };
  previousMonth: { totalIncome: number; totalExpenses: number };
  expensesByCategory: { name: string; total: number }[];
  incomeByCategory: { name: string; total: number }[];
  historicalMonths: { month: string; monthKey: string; expenses: number; income: number; topCategory: string }[];
  projection: { estimatedExpenses: number; estimatedIncome: number; projectedBalance: number };
  score: { value: number; level: string; criteria: { name: string; met: boolean; points: number }[] };
  ai: {
    narrative: string | null;
    historicalObservation: string | null;
    projectionInterpretation: string | null;
    scoreAnalysis: { strengths: string[]; improvements: string[]; motivation: string } | null;
    unavailable: boolean;
    unavailableReason?: string | null;
  };
}

function ConsentNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0" />
      Ative o compartilhamento de dados nas configurações para ver esta análise.
    </div>
  );
}

function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const isUp = current > previous;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-red-500" : "text-emerald-500"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

export function ReportPreview({ data }: { data: ReportPreviewData }) {
  const { summary, historicalMonths, projection, score, ai } = data;

  return (
    <div className="space-y-6">
      {/* Score */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-start sm:gap-8">
          <ScoreGauge value={score.value} level={score.level} />
          <div className="flex-1 space-y-3">
            {ai.scoreAnalysis ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Pontos fortes</p>
                  <ul className="space-y-1">
                    {ai.scoreAnalysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-500 mt-0.5">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Pontos de melhoria</p>
                  <ul className="space-y-1">
                    {ai.scoreAnalysis.improvements.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-orange-500 mt-0.5">!</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                {ai.scoreAnalysis.motivation && (
                  <p className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                    {ai.scoreAnalysis.motivation}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Critérios</p>
                {score.criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={c.met ? "text-emerald-500" : "text-muted-foreground/40"}>
                      {c.met ? "✓" : "✗"}
                    </span>
                    <span className={c.met ? "" : "text-muted-foreground"}>{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.points}pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Narrative */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Narrativa do mês</CardTitle>
        </CardHeader>
        <CardContent>
          {ai.narrative ? (
            <p className="text-sm leading-relaxed">{ai.narrative}</p>
          ) : ai.unavailable ? (
            <AiUnavailableNotice reason={ai.unavailableReason} />
          ) : (
            <ConsentNotice />
          )}
        </CardContent>
      </Card>

      {/* Historical comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparativo histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {historicalMonths.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Mês</th>
                    <th className="pb-2 text-right font-medium">Despesas</th>
                    <th className="pb-2 text-right font-medium">Receitas</th>
                    <th className="pb-2 text-right font-medium">Var.</th>
                    <th className="pb-2 text-left font-medium pl-3">Top cat.</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalMonths.map((m, i) => {
                    const prev = i > 0 ? historicalMonths[i - 1].expenses : 0;
                    return (
                      <tr key={m.monthKey} className="border-b border-border/50 last:border-0">
                        <td className="py-2 font-medium capitalize">{m.month}</td>
                        <td className="py-2 text-right">{formatCurrency(m.expenses)}</td>
                        <td className="py-2 text-right">{formatCurrency(m.income)}</td>
                        <td className="py-2 text-right">
                          {i > 0 ? <VariationBadge current={m.expenses} previous={prev} /> : <Minus className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
                        </td>
                        <td className="py-2 pl-3 text-muted-foreground">{m.topCategory}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Dados históricos insuficientes.</p>
          )}
          {ai.historicalObservation ? (
            <p className="text-sm leading-relaxed border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
              {ai.historicalObservation}
            </p>
          ) : !ai.unavailable && !ai.narrative ? (
            <ConsentNotice />
          ) : null}
        </CardContent>
      </Card>

      {/* Projection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projeção próximo mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Receitas est.", value: projection.estimatedIncome, color: "text-emerald-500" },
              { label: "Despesas est.", value: projection.estimatedExpenses, color: "text-red-500" },
              { label: "Saldo est.", value: projection.projectedBalance, color: projection.projectedBalance >= 0 ? "text-primary" : "text-red-500" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
          {ai.projectionInterpretation ? (
            <p className="text-sm leading-relaxed border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
              {ai.projectionInterpretation}
            </p>
          ) : !ai.unavailable && !ai.narrative ? (
            <ConsentNotice />
          ) : null}
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <Info className="h-3 w-3" />
            Projeção baseada no seu histórico. Não é garantia de resultado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AiUnavailableNotice({ reason }: { reason?: string | null }) {
  const messages: Record<string, string> = {
    token_limit: "Limite de análise IA atingido hoje. Tente novamente amanhã ou gere o relatório sem análise.",
    rate_limit: "Limite de requisições atingido. Tente novamente em alguns minutos.",
    credits_exhausted: "Créditos de IA esgotados.",
    not_configured: "IA não configurada.",
    ai_error: "Erro temporário na análise IA. Tente novamente.",
    parse_error: "Erro ao processar a análise IA.",
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      <Info className="h-4 w-4 shrink-0" />
      {messages[reason || ""] || "Análise IA indisponível no momento."}
    </div>
  );
}
