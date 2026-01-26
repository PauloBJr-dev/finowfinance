-- Atualizar função find_or_create_invoice para SEMPRE buscar fatura open primeiro
-- e criar faturas com base na escolha do usuário

CREATE OR REPLACE FUNCTION public.find_or_create_invoice(
  p_card_id UUID,
  p_user_id UUID,
  p_transaction_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_cycle RECORD;
  v_next_cycle RECORD;
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_card_id;
  END IF;
  
  -- REGRA PRINCIPAL: Sempre buscar fatura OPEN primeiro para este cartão
  -- Esta é a fatura atual que deve receber todas as despesas
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND status = 'open'
  ORDER BY closing_date ASC  -- Pegar a mais próxima
  LIMIT 1;
  
  -- Se existe fatura open, usar ela
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;
  
  -- Se não existe fatura open, calcular o ciclo para a data da transação
  SELECT * INTO v_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  -- Verificar se existe fatura para este ciclo (mesmo que closed/paid)
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND closing_date = v_cycle.closing_date
  LIMIT 1;
  
  -- Se existe mas está closed/paid, criar próxima fatura
  IF v_invoice_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM invoices WHERE id = v_invoice_id AND status IN ('closed', 'paid')) THEN
      SELECT * INTO v_next_cycle 
      FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_cycle.closing_date + INTERVAL '1 day');
      
      INSERT INTO invoices (
        card_id, user_id, cycle_start_date, cycle_end_date, 
        closing_date, due_date, status, total_amount
      )
      VALUES (
        p_card_id, p_user_id, v_next_cycle.cycle_start_date, v_next_cycle.cycle_end_date,
        v_next_cycle.closing_date, v_next_cycle.due_date, 'open', 0
      )
      RETURNING id INTO v_invoice_id;
    END IF;
    -- Se existe e está open, retornar (já deveria ter retornado acima)
    RETURN v_invoice_id;
  END IF;
  
  -- Não existe nenhuma fatura, criar nova
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
$$;

-- Função auxiliar para criar fatura inicial no cadastro de cartão
CREATE OR REPLACE FUNCTION public.create_initial_invoice(
  p_card_id UUID,
  p_user_id UUID,
  p_initial_invoice_month DATE,  -- Primeiro dia do mês escolhido (ex: 2026-02-01)
  p_create_previous_closed BOOLEAN DEFAULT false
)
RETURNS TABLE(current_invoice_id UUID, previous_invoice_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_current_cycle RECORD;
  v_previous_cycle RECORD;
  v_current_id UUID;
  v_previous_id UUID := NULL;
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_card_id;
  END IF;
  
  -- Calcular ciclo para o mês escolhido
  -- Usamos o dia de fechamento do mês escolhido como referência
  SELECT * INTO v_current_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_initial_invoice_month + (v_closing_day - 1));
  
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
  
  RETURN QUERY SELECT v_current_id, v_previous_id;
END;
$$;