/**
 * Constantes de negócio do Finow
 * Centraliza valores mágicos para evitar duplicação e facilitar manutenção
 */

// =====================
// Limites e Configurações de Parcelas
// =====================

/** Número máximo de parcelas permitidas */
export const MAX_INSTALLMENTS = 48;

/** Número mínimo de parcelas */
export const MIN_INSTALLMENTS = 2;

// =====================
// Limites de Tokens AI
// =====================

/** Limite diário de tokens por usuário (padrão) */
export const DEFAULT_USER_TOKEN_LIMIT = 5000;

/** Limite diário global de tokens */
export const GLOBAL_DAILY_TOKEN_LIMIT = 100000;

// =====================
// Soft Delete e Retenção
// =====================

/** Dias para retenção de soft delete antes de exclusão permanente */
export const SOFT_DELETE_RETENTION_DAYS = 30;

// =====================
// UI e UX
// =====================

/** Duração do toast de undo em milissegundos */
export const UNDO_TOAST_DURATION_MS = 8000;

/** Duração do toast de sucesso em milissegundos */
export const SUCCESS_TOAST_DURATION_MS = 3000;

/** Duração do toast de erro em milissegundos */
export const ERROR_TOAST_DURATION_MS = 5000;

// =====================
// Recorrência
// =====================

/** Número de meses para criar contas recorrentes */
export const RECURRING_BILLS_MONTHS = 6;

// =====================
// Formatação
// =====================

/** Locale padrão para formatação (pt-BR) */
export const DEFAULT_LOCALE = 'pt-BR';

/** Moeda padrão */
export const DEFAULT_CURRENCY = 'BRL';

/** Timezone padrão */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
