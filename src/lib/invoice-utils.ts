/**
 * Utilitários para cálculo e gerenciamento de faturas
 * Atualizado para usar ciclo bancário real (closing_date ao invés de reference_month)
 */

export interface InvoicePeriod {
  cycleStartDate: Date;
  cycleEndDate: Date;
  closingDate: Date;
  dueDate: Date;
}

/**
 * Calcula o período de uma fatura baseado no dia de fechamento e vencimento
 * REGRA: Se a data da transação é APÓS o fechamento, vai para o próximo ciclo
 * 
 * @param closingDay Dia do fechamento (1-31)
 * @param dueDay Dia do vencimento (1-31)
 * @param transactionDate Data da transação (default: hoje)
 */
export function calculateInvoiceCycle(
  closingDay: number,
  dueDay: number,
  transactionDate: Date = new Date()
): InvoicePeriod {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth();
  
  // Calcular o dia de fechamento real (ajustando para meses com menos dias)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const actualClosingDay = Math.min(closingDay, daysInMonth);
  
  // Data de fechamento deste mês
  let closingDate = new Date(year, month, actualClosingDay);
  
  // Se a transação é APÓS o fechamento, vai para o ciclo do PRÓXIMO mês
  if (transactionDate > closingDate) {
    closingDate = new Date(closingDate);
    closingDate.setMonth(closingDate.getMonth() + 1);
    // Recalcular para o novo mês
    const newDaysInMonth = new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, 0).getDate();
    const newActualClosingDay = Math.min(closingDay, newDaysInMonth);
    closingDate.setDate(newActualClosingDay);
  }
  
  // Ciclo: do dia após fechamento anterior até o dia de fechamento atual
  const cycleEndDate = new Date(closingDate);
  const cycleStartDate = new Date(closingDate);
  cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
  cycleStartDate.setDate(cycleStartDate.getDate() + 1);
  
  // Calcular data de vencimento
  let dueDate: Date;
  if (dueDay <= closingDay) {
    // Vencimento no mês seguinte ao fechamento
    dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, 1);
    const dueDaysInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
    const actualDueDay = Math.min(dueDay, dueDaysInMonth);
    dueDate.setDate(actualDueDay);
  } else {
    // Vencimento no mesmo mês do fechamento
    const dueDaysInMonth = new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, 0).getDate();
    const actualDueDay = Math.min(dueDay, dueDaysInMonth);
    dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth(), actualDueDay);
  }
  
  return {
    cycleStartDate,
    cycleEndDate,
    closingDate,
    dueDate,
  };
}

/**
 * Formata período do ciclo para exibição
 * Ex: "02/jan - 01/fev"
 */
export function formatCyclePeriod(cycleStartDate: Date | string, cycleEndDate: Date | string): string {
  const start = new Date(cycleStartDate);
  const end = new Date(cycleEndDate);
  
  const formatOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  
  return `${start.toLocaleDateString('pt-BR', formatOptions)} - ${end.toLocaleDateString('pt-BR', formatOptions)}`;
}

/**
 * Formata mês da fatura para exibição baseado no closing_date
 * Ex: "Fevereiro 2026"
 */
export function formatInvoiceMonth(closingDate: Date | string): string {
  const date = new Date(closingDate);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

/**
 * Verifica se uma fatura pode ser paga
 * REGRA: Só pode pagar faturas com status 'closed'
 */
export function canPayInvoice(status: 'open' | 'closed' | 'paid'): boolean {
  return status === 'closed';
}

/**
 * Retorna mensagem explicativa sobre pagamento
 */
export function getPaymentStatusMessage(status: 'open' | 'closed' | 'paid'): string | null {
  switch (status) {
    case 'open':
      return 'Esta fatura ainda está aberta. Aguarde o fechamento para efetuar o pagamento.';
    case 'paid':
      return 'Esta fatura já foi paga.';
    default:
      return null;
  }
}