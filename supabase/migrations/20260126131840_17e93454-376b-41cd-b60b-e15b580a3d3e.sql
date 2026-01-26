-- Fix create_initial_invoice function to use middle of month for accurate cycle calculation
CREATE OR REPLACE FUNCTION public.create_initial_invoice(
  p_card_id uuid, 
  p_user_id uuid, 
  p_initial_invoice_month date, 
  p_create_previous_closed boolean DEFAULT false
)
RETURNS TABLE(current_invoice_id uuid, previous_invoice_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_current_cycle RECORD;
  v_previous_cycle RECORD;
  v_current_id UUID;
  v_previous_id UUID := NULL;
  v_reference_date DATE;
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_card_id;
  END IF;
  
  -- CORREÇÃO: Usar dia 15 do mês selecionado como referência segura
  -- Isso garante que sempre caia no ciclo correto, independente do dia de fechamento
  v_reference_date := p_initial_invoice_month + INTERVAL '14 days';
  
  -- Calcular ciclo para o mês escolhido
  SELECT * INTO v_current_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_reference_date);
  
  -- Verificar se já existe fatura para este ciclo
  SELECT id INTO v_current_id
  FROM invoices
  WHERE card_id = p_card_id
    AND closing_date = v_current_cycle.closing_date
  LIMIT 1;
  
  -- Se já existe, retornar a existente
  IF v_current_id IS NOT NULL THEN
    RETURN QUERY SELECT v_current_id, v_previous_id;
    RETURN;
  END IF;
  
  -- Criar fatura atual (open)
  INSERT INTO invoices (
    card_id, user_id, cycle_start_date, cycle_end_date, 
    closing_date, due_date, status, total_amount
  )
  VALUES (
    p_card_id, p_user_id, v_current_cycle.cycle_start_date, v_current_cycle.cycle_end_date,
    v_current_cycle.closing_date, v_current_cycle.due_date, 'open', 0
  )
  RETURNING id INTO v_current_id;
  
  -- Se solicitado, criar fatura anterior como closed
  IF p_create_previous_closed THEN
    SELECT * INTO v_previous_cycle 
    FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_current_cycle.cycle_start_date - INTERVAL '1 day');
    
    -- Verificar se já existe
    SELECT id INTO v_previous_id
    FROM invoices
    WHERE card_id = p_card_id
      AND closing_date = v_previous_cycle.closing_date
    LIMIT 1;
    
    -- Se não existe, criar
    IF v_previous_id IS NULL THEN
      INSERT INTO invoices (
        card_id, user_id, cycle_start_date, cycle_end_date, 
        closing_date, due_date, status, total_amount
      )
      VALUES (
        p_card_id, p_user_id, v_previous_cycle.cycle_start_date, v_previous_cycle.cycle_end_date,
        v_previous_cycle.closing_date, v_previous_cycle.due_date, 'closed', 0
      )
      RETURNING id INTO v_previous_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_current_id, v_previous_id;
END;
$function$;

-- Cleanup: Desvincular transações de cartão com invoice_id inválidos
UPDATE transactions 
SET invoice_id = NULL 
WHERE payment_method = 'credit_card' 
  AND invoice_id IS NOT NULL
  AND invoice_id NOT IN (SELECT id FROM invoices);