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
  max?: number;
}

const MAX_CENTS = 999999999; // R$ 9.999.999,99

function formatFromCents(cents: number): string {
  if (cents === 0) return "";
  const reais = cents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais);
}

/**
 * Input de moeda formatado para BRL
 * Trabalha internamente com centavos para evitar bugs de acumulação
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  className,
  disabled = false,
  autoFocus = false,
  max,
}: CurrencyInputProps) {
  const [centsState, setCentsState] = useState(0);
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value → internal cents
  useEffect(() => {
    const externalCents = Math.round(value * 100);
    if (externalCents !== centsState) {
      setCentsState(externalCents);
      setDisplayValue(formatFromCents(externalCents));
    }
  }, [value]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Extract only digits from the current input
    const digitsOnly = rawValue.replace(/\D/g, "");

    // Limit to 9 digits (max R$ 9.999.999,99)
    const limited = digitsOnly.slice(0, 9);

    let cents = parseInt(limited, 10) || 0;

    // Apply custom max if provided
    const effectiveMax = max ? Math.min(Math.round(max * 100), MAX_CENTS) : MAX_CENTS;
    if (cents > effectiveMax) {
      cents = effectiveMax;
    }

    setCentsState(cents);
    setDisplayValue(formatFromCents(cents));
    onChange(cents / 100);
  };

  const handleFocus = () => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleBlur = () => {
    if (centsState === 0) {
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
      className={cn("text-lg font-medium tabular-nums", className)}
    />
  );
}
