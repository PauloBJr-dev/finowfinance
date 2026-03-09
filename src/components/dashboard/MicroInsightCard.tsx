import { Lightbulb } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface CategoryTotal {
  name: string;
  total: number;
}

interface Props {
  income: number;
  expenses: number;
  prevExpenses: number | null;
  transactions: Array<{
    type: string;
    amount: number;
    payment_method?: string;
    categories?: { name: string } | null;
  }>;
}

function generateInsight({ income, expenses, prevExpenses, transactions }: Props): string {
  // 1. Despesas > receitas
  if (expenses > 0 && expenses > income) {
    const diff = formatCurrency(expenses - income);
    return `Suas despesas superaram as receitas em ${diff} neste período. Fique de olho!`;
  }

  // 2. Comparação com mês anterior
  if (prevExpenses && prevExpenses > 0) {
    const pctChange = ((expenses - prevExpenses) / prevExpenses) * 100;
    if (pctChange < -5) {
      return `Parabéns! Você gastou ${Math.abs(Math.round(pctChange))}% menos que no mês anterior. 🎉`;
    }
    if (pctChange > 15) {
      return `Atenção: seus gastos subiram ${Math.round(pctChange)}% em relação ao mês passado.`;
    }
  }

  // 3. Categoria dominante
  if (transactions.length > 0) {
    const expenseTx = transactions.filter((t) => t.type === "expense");
    const totalExpense = expenseTx.reduce((s, t) => s + Number(t.amount), 0);

    if (totalExpense > 0) {
      const byCategory: Record<string, CategoryTotal> = {};
      expenseTx.forEach((t) => {
        const name = t.categories?.name || "Outros";
        if (!byCategory[name]) byCategory[name] = { name, total: 0 };
        byCategory[name].total += Number(t.amount);
      });

      const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);
      const top = sorted[0];
      const pct = Math.round((top.total / totalExpense) * 100);

      if (pct >= 40) {
        return `"${top.name}" representou ${pct}% das suas despesas — vale a pena monitorar.`;
      }
    }
  }

  // 4. Saldo positivo
  if (income > expenses && income > 0) {
    const sobra = formatCurrency(income - expenses);
    return `Você está com saldo positivo de ${sobra}. Que tal guardar uma parte? 💰`;
  }

  // 5. Fallback
  const count = transactions.length;
  return `Você registrou ${count} transaç${count === 1 ? "ão" : "ões"} neste período.`;
}

export function MicroInsightCard(props: Props) {
  const insight = generateInsight(props);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <Lightbulb className="h-4 w-4 text-primary" />
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed pt-1">{insight}</p>
    </div>
  );
}
