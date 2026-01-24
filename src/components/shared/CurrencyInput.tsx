import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Input de moeda formatado para BRL
 * Aceita apenas números e formata automaticamente
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  className,
  disabled = false,
  autoFocus = false,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Formata valor numérico para exibição
  useEffect(() => {
    if (value === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Remove tudo exceto números
    const numericOnly = rawValue.replace(/\D/g, "");
    
    // Converte para centavos e depois para reais
    const cents = parseInt(numericOnly, 10) || 0;
    const reais = cents / 100;
    
    onChange(reais);
    setDisplayValue(formatCurrency(reais));
  };

  const handleFocus = () => {
    // Seleciona todo o texto ao focar
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.select();
      }, 0);
    }
  };

  const handleBlur = () => {
    // Se vazio, mostra placeholder
    if (value === 0) {
      setDisplayValue("");
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "text-lg font-medium tabular-nums",
        className
      )}
    />
  );
}
