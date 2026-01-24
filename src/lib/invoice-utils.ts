/**
 * Utilitários para cálculo e gerenciamento de faturas
 */

export interface InvoicePeriod {
  referenceMonth: Date;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
}

/**
 * Calcula o período de uma fatura baseado no dia de fechamento e vencimento
 * @param billingDay Dia do fechamento (1-31)
 * @param dueDay Dia do vencimento (1-31)
 * @param referenceDate Data de referência (default: hoje)
 */
export function calculateInvoicePeriod(
  billingDay: number,
  dueDay: number,
  referenceDate: Date = new Date()
): InvoicePeriod {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  // Mês de referência é o mês do fechamento
  const referenceMonth = new Date(year, month, 1);
  
  // Data de início: dia após fechamento do mês anterior
  const startDate = new Date(year, month - 1, billingDay + 1);
  
  // Data de fechamento: dia do fechamento do mês atual
  const endDate = new Date(year, month, billingDay);
  
  // Data de vencimento: dia do vencimento
  // Se dueDay < billingDay, vencimento é no mês seguinte
  const dueMonth = dueDay < billingDay ? month + 1 : month;
  const dueDate = new Date(year, dueMonth, dueDay);
  
  return {
    referenceMonth,
    startDate,
    endDate,
    dueDate,
  };
}

/**
 * Encontra a fatura correta para uma transação
 * Se a fatura atual estiver fechada ou paga, retorna a próxima
 */
export function findCorrectInvoicePeriod(
  billingDay: number,
  dueDay: number,
  transactionDate: Date,
  currentInvoiceStatus: 'open' | 'closed' | 'paid'
): InvoicePeriod {
  const currentPeriod = calculateInvoicePeriod(billingDay, dueDay, transactionDate);
  
  // Se a fatura atual está aberta, usa ela
  if (currentInvoiceStatus === 'open') {
    return currentPeriod;
  }
  
  // Se fechada ou paga, vai para a próxima fatura
  const nextMonth = new Date(transactionDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  return calculateInvoicePeriod(billingDay, dueDay, nextMonth);
}

/**
 * Gera períodos de faturas para os próximos N meses
 */
export function generateInvoicePeriods(
  billingDay: number,
  dueDay: number,
  count: number = 2,
  startDate: Date = new Date()
): InvoicePeriod[] {
  const periods: InvoicePeriod[] = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    periods.push(calculateInvoicePeriod(billingDay, dueDay, date));
  }
  
  return periods;
}

/**
 * Verifica se uma data está dentro de um período de fatura
 */
export function isDateInInvoicePeriod(
  date: Date,
  period: InvoicePeriod
): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const start = new Date(period.startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(period.endDate);
  end.setHours(23, 59, 59, 999);
  
  return d >= start && d <= end;
}

/**
 * Formata status da fatura para exibição
 */
export function formatInvoiceStatus(status: 'open' | 'closed' | 'paid'): string {
  const statusMap = {
    open: 'Aberta',
    closed: 'Fechada',
    paid: 'Paga',
  };
  return statusMap[status] || status;
}

/**
 * Retorna cor do status da fatura (classes Tailwind)
 */
export function getInvoiceStatusColor(status: 'open' | 'closed' | 'paid'): string {
  const colorMap = {
    open: 'bg-primary/10 text-primary',
    closed: 'bg-warning/10 text-warning',
    paid: 'bg-success/10 text-success',
  };
  return colorMap[status] || 'bg-muted text-muted-foreground';
}
