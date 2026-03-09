/**
 * Utilitários de formatação para o Finow
 * Idioma: PT-BR | Moeda: BRL
 */

/**
 * Formata valor numérico para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata valor compacto (ex: R$ 1.5K)
 */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value);
}

/**
 * Formata data para exibição
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formata data de forma amigável (Hoje, Ontem, etc.)
 */
export function formatDateRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, today)) return 'Hoje';
  if (isSameDay(d, yesterday)) return 'Ontem';

  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d);
  }

  return formatDate(d);
}

/**
 * Verifica se duas datas são o mesmo dia
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Formata mês/ano por extenso (ex: Janeiro 2026)
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Formata mês abreviado (ex: Jan/26)
 */
export function formatMonthShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  }).format(d);
}

/**
 * Retorna saudação baseada na hora do dia
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Extrai primeiro nome
 */
export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

/**
 * Formata número de parcelas
 */
export function formatInstallments(current: number, total: number): string {
  return `${current}/${total}x`;
}

/**
 * Parseia string de moeda para número
 */
export function parseCurrency(value: string): number {
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, '');
  // Substitui vírgula por ponto (padrão BR)
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Formata data curta para exibição (ex: 02/jan)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

/**
 * Formata período do ciclo de fatura
 * Ex: "02/jan - 01/fev"
 */
export function formatCyclePeriod(startDate: Date | string, endDate: Date | string): string {
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

/**
 * Formata Date para string YYYY-MM-DD sem conversão UTC (evita bug de timezone)
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
