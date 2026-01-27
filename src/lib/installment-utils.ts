/**
 * Utilitários para cálculo de parcelamento
 * Regra: resto aplicado à ÚLTIMA parcela
 */

import { formatCurrency } from "@/lib/format";

export interface InstallmentPreview {
  number: number;
  amount: number;
  dueDate: Date;
}

/**
 * Calcula valores das parcelas com resto na última
 * @param total Valor total da compra
 * @param installments Número de parcelas
 * @returns Array com valor de cada parcela
 */
export function calculateInstallments(
  total: number,
  installments: number
): number[] {
  if (installments <= 0) return [];
  if (installments === 1) return [total];

  // Calcula valor base com 2 casas decimais (arredondado para baixo)
  const baseAmount = Math.floor((total / installments) * 100) / 100;
  
  // Calcula o resto que vai para a última parcela
  const remainder = Math.round((total - baseAmount * installments) * 100) / 100;
  
  // Cria array de parcelas
  const result: number[] = [];
  for (let i = 0; i < installments - 1; i++) {
    result.push(baseAmount);
  }
  
  // Última parcela recebe o resto
  result.push(Math.round((baseAmount + remainder) * 100) / 100);
  
  return result;
}

/**
 * Gera preview de parcelas com datas
 * @param total Valor total
 * @param installments Número de parcelas
 * @param startDate Data da primeira parcela
 * @returns Array com preview de cada parcela
 */
export function generateInstallmentPreview(
  total: number,
  installments: number,
  startDate: Date = new Date()
): InstallmentPreview[] {
  const amounts = calculateInstallments(total, installments);
  
  return amounts.map((amount, index) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + index);
    
    return {
      number: index + 1,
      amount,
      dueDate,
    };
  });
}

/**
 * Formata preview compacto de parcelamento
 * Ex: "3x de R$ 166,67 (última: R$ 166,66)"
 */
export function formatInstallmentPreview(
  total: number,
  installments: number
): string {
  if (installments <= 1) {
    return '';
  }
  
  const amounts = calculateInstallments(total, installments);
  const baseAmount = amounts[0];
  const lastAmount = amounts[amounts.length - 1];
  
  if (baseAmount === lastAmount) {
    return `${installments}x de ${formatCurrency(baseAmount)}`;
  }
  
  return `${installments}x de ${formatCurrency(baseAmount)} (última: ${formatCurrency(lastAmount)})`;
}
