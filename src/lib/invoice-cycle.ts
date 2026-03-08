/**
 * Lógica de ciclo de fatura do Finow
 * REGRAS VALIDADAS — não alterar sem revisão
 */

/**
 * Determina o mês da fatura que receberá uma compra.
 *
 * REGRA:
 * - Se o dia da compra >= billing_day → fatura do mês atual JÁ FECHOU
 *   → compra vai para o MÊS SEGUINTE
 * - Se o dia da compra < billing_day → fatura do mês atual ainda está ABERTA
 *   → compra vai para o MÊS ATUAL
 *
 * EXEMPLOS:
 * billing_day=3, compra em 08/03 → Abril  (8 >= 3, março fechou)
 * billing_day=3, compra em 02/03 → Março  (2 < 3, março ainda aberto)
 * billing_day=3, compra em 03/03 → Abril  (3 >= 3, março fechou no dia)
 * billing_day=10, compra em 08/03 → Março (8 < 10, março ainda aberto)
 *
 * @returns Date — sempre o PRIMEIRO DIA do mês alvo (ex: 2026-04-01 para Abril)
 */
export function getTargetInvoiceMonth(billingDay: number, purchaseDate: Date): Date {
  const day = purchaseDate.getDate();
  const month = purchaseDate.getMonth(); // 0-11
  const year = purchaseDate.getFullYear();

  if (day >= billingDay) {
    // Fatura do mês atual já fechou → próximo mês
    if (month === 11) {
      return new Date(year + 1, 0, 1); // Janeiro do ano seguinte
    }
    return new Date(year, month + 1, 1);
  }

  // Fatura do mês atual ainda aberta
  return new Date(year, month, 1);
}

/**
 * Gera os meses de cada parcela de um parcelamento.
 *
 * REGRA:
 * - A parcela 1 vai para o mês determinado por getTargetInvoiceMonth()
 * - A parcela 2 vai para o mês seguinte
 * - A parcela N vai para N-1 meses após a parcela 1
 *
 * EXEMPLO:
 * billing_day=3, compra em 08/03, 3x:
 *   Parcela 1 → Abril/2026
 *   Parcela 2 → Maio/2026
 *   Parcela 3 → Junho/2026
 */
export function getInstallmentMonths(
  billingDay: number,
  purchaseDate: Date,
  installmentCount: number
): Date[] {
  const firstMonth = getTargetInvoiceMonth(billingDay, purchaseDate);
  const months: Date[] = [];

  for (let i = 0; i < installmentCount; i++) {
    const m = firstMonth.getMonth() + i;
    const y = firstMonth.getFullYear() + Math.floor(m / 12);
    months.push(new Date(y, m % 12, 1));
  }

  return months;
}

/**
 * Distribui o valor total entre N parcelas.
 *
 * REGRA: divisão aritmética em centavos.
 * O centavo restante vai SEMPRE para a ÚLTIMA parcela.
 * A soma das parcelas é SEMPRE igual ao total original.
 *
 * EXEMPLOS:
 * R$100,00 em 3x → [33.33, 33.33, 33.34]  soma = R$100,00 ✅
 * R$99,99 em 4x  → [24.99, 24.99, 24.99, 25.02] soma = R$99,99 ✅
 * R$185,40 em 6x → [30.90, 30.90, 30.90, 30.90, 30.90, 30.90] ✅
 */
export function distributeInstallments(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const baseAmountCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseAmountCents * count;

  const amounts = Array(count).fill(baseAmountCents / 100);
  // Resto vai SEMPRE para a última parcela
  amounts[count - 1] =
    Math.round((amounts[count - 1] + remainderCents / 100) * 100) / 100;

  return amounts;
}

/**
 * Formata o mês da fatura para exibição.
 * Ex: new Date(2026, 3, 1) → "Abril/26"
 */
export function formatInvoiceMonth(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: '2-digit',
  }).format(date);
}

/**
 * Formata o período do ciclo para exibição.
 * Ex: "02/mar – 01/abr"
 */
export function formatCyclePeriod(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
  return `${fmt(start)} – ${fmt(end)}`;
}
