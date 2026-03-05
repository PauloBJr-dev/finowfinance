-- Add auth.uid() validation to SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.get_or_create_monthly_invoice(p_card_id uuid, p_user_id uuid, p_target_month date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id AND deleted_at IS NULL;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado ou excluído';
  END IF;
  
  v_target_year := EXTRACT(YEAR FROM p_target_month);
  v_target_month_num := EXTRACT(MONTH FROM p_target_month);
  v_closing_date := make_date(v_target_year, v_target_month_num, 1);
  
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND user_id = p_user_id
    AND date_trunc('month', closing_date) = date_trunc('month', v_closing_date)
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;
  
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
  v_closing_date := make_date(v_target_year, v_target_month_num, LEAST(v_closing_day, v_days_in_month));
  v_cycle_start_date := (v_closing_date - INTERVAL '1 month')::DATE + INTERVAL '1 day';
  v_cycle_end_date := v_closing_date;
  
  IF v_due_day <= v_closing_day THEN
    v_due_date := (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month')::DATE;
    v_days_in_month := EXTRACT(DAY FROM (v_due_date + INTERVAL '1 month - 1 day'));
    v_due_date := make_date(EXTRACT(YEAR FROM v_due_date)::INTEGER, EXTRACT(MONTH FROM v_due_date)::INTEGER, LEAST(v_due_day, v_days_in_month));
  ELSE
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
    v_due_date := make_date(v_target_year, v_target_month_num, LEAST(v_due_day, v_days_in_month));
  END IF;
  
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
$function$;

-- Fix find_or_create_invoice (3 params)
CREATE OR REPLACE FUNCTION public.find_or_create_invoice(p_card_id uuid, p_user_id uuid, p_transaction_date date)
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
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado';
  END IF;
  
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id AND status = 'open' AND deleted_at IS NULL
  ORDER BY closing_date ASC LIMIT 1;
  
  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;
  
  SELECT * INTO v_cycle FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  SELECT id INTO v_invoice_id
  FROM invoices WHERE card_id = p_card_id AND closing_date = v_cycle.closing_date AND deleted_at IS NULL LIMIT 1;
  
  IF v_invoice_id IS NOT NULL THEN RETURN v_invoice_id; END IF;
  
  INSERT INTO invoices (card_id, user_id, cycle_start_date, cycle_end_date, closing_date, due_date, status, total_amount)
  VALUES (p_card_id, p_user_id, v_cycle.cycle_start_date, v_cycle.cycle_end_date, v_cycle.closing_date, v_cycle.due_date, 'open', 0)
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$function$;

-- Fix find_or_create_invoice (4 params)
CREATE OR REPLACE FUNCTION public.find_or_create_invoice(p_card_id uuid, p_user_id uuid, p_transaction_date date, p_is_future_installment boolean DEFAULT false)
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
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado';
  END IF;
  
  IF NOT p_is_future_installment THEN
    SELECT id INTO v_invoice_id
    FROM invoices WHERE card_id = p_card_id AND status = 'open' AND deleted_at IS NULL
    ORDER BY closing_date ASC LIMIT 1;
    IF v_invoice_id IS NOT NULL THEN RETURN v_invoice_id; END IF;
  END IF;
  
  SELECT * INTO v_cycle FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  SELECT id INTO v_invoice_id
  FROM invoices WHERE card_id = p_card_id AND closing_date = v_cycle.closing_date AND deleted_at IS NULL LIMIT 1;
  
  IF v_invoice_id IS NOT NULL THEN RETURN v_invoice_id; END IF;
  
  INSERT INTO invoices (card_id, user_id, cycle_start_date, cycle_end_date, closing_date, due_date, status, total_amount)
  VALUES (p_card_id, p_user_id, v_cycle.cycle_start_date, v_cycle.cycle_end_date, v_cycle.closing_date, v_cycle.due_date, 'open', 0)
  RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$function$;

-- Fix create_initial_invoice
CREATE OR REPLACE FUNCTION public.create_initial_invoice(p_card_id uuid, p_user_id uuid, p_initial_invoice_month date, p_create_previous_closed boolean DEFAULT false)
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
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado';
  END IF;
  
  v_reference_date := p_initial_invoice_month + INTERVAL '14 days';
  SELECT * INTO v_current_cycle FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_reference_date);
  
  SELECT id INTO v_current_id FROM invoices WHERE card_id = p_card_id AND closing_date = v_current_cycle.closing_date LIMIT 1;
  
  IF v_current_id IS NOT NULL THEN
    RETURN QUERY SELECT v_current_id, v_previous_id;
    RETURN;
  END IF;
  
  INSERT INTO invoices (card_id, user_id, cycle_start_date, cycle_end_date, closing_date, due_date, status, total_amount)
  VALUES (p_card_id, p_user_id, v_current_cycle.cycle_start_date, v_current_cycle.cycle_end_date, v_current_cycle.closing_date, v_current_cycle.due_date, 'open', 0)
  RETURNING id INTO v_current_id;
  
  IF p_create_previous_closed THEN
    SELECT * INTO v_previous_cycle FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_current_cycle.cycle_start_date - INTERVAL '1 day');
    SELECT id INTO v_previous_id FROM invoices WHERE card_id = p_card_id AND closing_date = v_previous_cycle.closing_date LIMIT 1;
    IF v_previous_id IS NULL THEN
      INSERT INTO invoices (card_id, user_id, cycle_start_date, cycle_end_date, closing_date, due_date, status, total_amount)
      VALUES (p_card_id, p_user_id, v_previous_cycle.cycle_start_date, v_previous_cycle.cycle_end_date, v_previous_cycle.closing_date, v_previous_cycle.due_date, 'closed', 0)
      RETURNING id INTO v_previous_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_current_id, v_previous_id;
END;
$function$;

-- Fix get_available_invoices
CREATE OR REPLACE FUNCTION public.get_available_invoices(p_card_id uuid, p_user_id uuid, p_months_ahead integer DEFAULT 6)
 RETURNS TABLE(invoice_id uuid, month_label text, closing_date date, due_date date, status text, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_month DATE;
  v_i INTEGER;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  v_current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  FOR v_i IN 0..p_months_ahead LOOP
    PERFORM get_or_create_monthly_invoice(p_card_id, p_user_id, (v_current_month + (v_i || ' months')::INTERVAL)::DATE);
  END LOOP;
  
  RETURN QUERY
  SELECT i.id, TO_CHAR(i.closing_date, 'TMMonth YYYY'), i.closing_date, i.due_date, i.status::text, i.total_amount
  FROM invoices i
  WHERE i.card_id = p_card_id AND i.user_id = p_user_id AND i.deleted_at IS NULL AND i.status != 'paid'
  ORDER BY i.closing_date ASC;
END;
$function$;