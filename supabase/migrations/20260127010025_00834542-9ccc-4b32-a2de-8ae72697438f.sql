-- CORREÇÃO: Adicionar parâmetro p_is_future_installment para diferenciar
-- compras à vista (usa fatura aberta) de parcelas futuras (calcula pelo ciclo)

CREATE OR REPLACE FUNCTION public.find_or_create_invoice(
  p_card_id uuid, 
  p_user_id uuid, 
  p_transaction_date date,
  p_is_future_installment boolean DEFAULT false
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_cycle RECORD;
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_card_id;
  END IF;
  
  -- LÓGICA CORRIGIDA:
  -- Para compras à vista (p_is_future_installment = false): usar fatura aberta
  -- Para parcelas futuras (p_is_future_installment = true): calcular ciclo pela data
  
  IF NOT p_is_future_installment THEN
    -- Compra à vista: buscar fatura ABERTA mais antiga
    SELECT id INTO v_invoice_id
    FROM invoices
    WHERE card_id = p_card_id
      AND status = 'open'
      AND deleted_at IS NULL
    ORDER BY closing_date ASC
    LIMIT 1;
    
    -- Se existe fatura aberta, usar ela
    IF v_invoice_id IS NOT NULL THEN
      RETURN v_invoice_id;
    END IF;
  END IF;
  
  -- Parcela futura OU não existe fatura aberta: calcular ciclo pela data
  SELECT * INTO v_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  -- Buscar fatura existente para este ciclo
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND closing_date = v_cycle.closing_date
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- Se existe, retornar
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;
  
  -- Criar nova fatura para o ciclo
  INSERT INTO invoices (
    card_id, user_id, cycle_start_date, cycle_end_date, 
    closing_date, due_date, status, total_amount
  )
  VALUES (
    p_card_id, p_user_id, v_cycle.cycle_start_date, v_cycle.cycle_end_date,
    v_cycle.closing_date, v_cycle.due_date, 'open', 0
  )
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$function$;