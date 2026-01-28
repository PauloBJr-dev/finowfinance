-- Nova RPC simplificada: buscar/criar fatura por mês (sem lógica de ciclos complexos)
-- O usuário escolhe para qual fatura a despesa vai. Default: mês seguinte à data da transação.

CREATE OR REPLACE FUNCTION public.get_or_create_monthly_invoice(
  p_card_id uuid,
  p_user_id uuid,
  p_target_month date  -- Primeiro dia do mês alvo (ex: 2026-02-01 para "Fatura de Fevereiro")
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_closing_date DATE;
  v_due_date DATE;
  v_cycle_start_date DATE;
  v_cycle_end_date DATE;
  v_days_in_month INTEGER;
  v_target_year INTEGER;
  v_target_month_num INTEGER;
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id AND deleted_at IS NULL;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado ou excluído: %', p_card_id;
  END IF;
  
  -- Normalizar para primeiro dia do mês
  v_target_year := EXTRACT(YEAR FROM p_target_month);
  v_target_month_num := EXTRACT(MONTH FROM p_target_month);
  
  -- Calcular closing_date como primeiro dia do mês (identificador simples)
  v_closing_date := make_date(v_target_year, v_target_month_num, 1);
  
  -- Buscar fatura existente para este mês
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND user_id = p_user_id
    AND date_trunc('month', closing_date) = date_trunc('month', v_closing_date)
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- Se existe, retornar
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;
  
  -- Calcular datas para nova fatura
  -- closing_date: dia de fechamento do cartão neste mês
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
  v_closing_date := make_date(v_target_year, v_target_month_num, LEAST(v_closing_day, v_days_in_month));
  
  -- cycle_start: dia após fechamento do mês anterior
  v_cycle_start_date := (v_closing_date - INTERVAL '1 month')::DATE + INTERVAL '1 day';
  
  -- cycle_end: dia de fechamento (mesmo que closing_date)
  v_cycle_end_date := v_closing_date;
  
  -- due_date: dia de vencimento
  IF v_due_day <= v_closing_day THEN
    -- Vencimento no mês seguinte
    v_due_date := (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month')::DATE;
    v_days_in_month := EXTRACT(DAY FROM (v_due_date + INTERVAL '1 month - 1 day'));
    v_due_date := make_date(EXTRACT(YEAR FROM v_due_date)::INTEGER, EXTRACT(MONTH FROM v_due_date)::INTEGER, LEAST(v_due_day, v_days_in_month));
  ELSE
    -- Vencimento no mesmo mês
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
    v_due_date := make_date(v_target_year, v_target_month_num, LEAST(v_due_day, v_days_in_month));
  END IF;
  
  -- Criar nova fatura (status 'open' - usuário altera manualmente)
  INSERT INTO invoices (
    card_id, user_id, cycle_start_date, cycle_end_date, 
    closing_date, due_date, status, total_amount
  )
  VALUES (
    p_card_id, p_user_id, v_cycle_start_date, v_cycle_end_date,
    v_closing_date, v_due_date, 'open', 0
  )
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$;

-- Função auxiliar para listar faturas disponíveis para seleção
CREATE OR REPLACE FUNCTION public.get_available_invoices(
  p_card_id uuid,
  p_user_id uuid,
  p_months_ahead integer DEFAULT 6
)
RETURNS TABLE(
  invoice_id uuid,
  month_label text,
  closing_date date,
  due_date date,
  status text,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_month DATE;
  v_i INTEGER;
BEGIN
  -- Garantir que temos faturas para os próximos N meses
  v_current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  FOR v_i IN 0..p_months_ahead LOOP
    -- Criar fatura se não existir (isso cria sob demanda)
    PERFORM get_or_create_monthly_invoice(
      p_card_id, 
      p_user_id, 
      (v_current_month + (v_i || ' months')::INTERVAL)::DATE
    );
  END LOOP;
  
  -- Retornar todas as faturas não pagas do cartão
  RETURN QUERY
  SELECT 
    i.id as invoice_id,
    TO_CHAR(i.closing_date, 'TMMonth YYYY') as month_label,
    i.closing_date,
    i.due_date,
    i.status::text,
    i.total_amount
  FROM invoices i
  WHERE i.card_id = p_card_id
    AND i.user_id = p_user_id
    AND i.deleted_at IS NULL
    AND i.status != 'paid'
  ORDER BY i.closing_date ASC;
END;
$$;

-- RPC para alterar status da fatura manualmente
CREATE OR REPLACE FUNCTION public.update_invoice_status(
  p_invoice_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
BEGIN
  -- Verificar se o usuário tem acesso à fatura
  SELECT user_id, status INTO v_user_id, v_current_status
  FROM invoices
  WHERE id = p_invoice_id AND deleted_at IS NULL;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  -- Validar transição de status
  IF p_new_status NOT IN ('open', 'closed', 'paid') THEN
    RAISE EXCEPTION 'Status inválido: %', p_new_status;
  END IF;
  
  -- Não permitir reabrir fatura paga
  IF v_current_status = 'paid' AND p_new_status != 'paid' THEN
    RAISE EXCEPTION 'Não é possível reabrir uma fatura paga';
  END IF;
  
  -- Atualizar status
  UPDATE invoices
  SET status = p_new_status::invoice_status,
      updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;