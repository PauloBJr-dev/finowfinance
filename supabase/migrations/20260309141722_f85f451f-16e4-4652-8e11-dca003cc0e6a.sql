CREATE OR REPLACE FUNCTION public.calculate_invoice_cycle(p_closing_day integer, p_due_day integer, p_transaction_date date)
 RETURNS TABLE(cycle_start_date date, cycle_end_date date, closing_date date, due_date date)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_closing_date DATE;
  v_cycle_start DATE;
  v_cycle_end DATE;
  v_due_date DATE;
  v_days_in_month INTEGER;
  v_actual_closing_day INTEGER;
  v_actual_due_day INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM p_transaction_date);
  v_month := EXTRACT(MONTH FROM p_transaction_date);
  
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month - 1 day'));
  v_actual_closing_day := LEAST(p_closing_day, v_days_in_month);
  
  v_closing_date := make_date(v_year, v_month, v_actual_closing_day);
  
  -- FIX: >= em vez de > para que compra no dia de fechamento vá para o próximo ciclo
  IF p_transaction_date >= v_closing_date THEN
    v_closing_date := v_closing_date + INTERVAL '1 month';
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
    v_actual_closing_day := LEAST(p_closing_day, v_days_in_month);
    v_closing_date := make_date(
      EXTRACT(YEAR FROM v_closing_date)::INTEGER, 
      EXTRACT(MONTH FROM v_closing_date)::INTEGER, 
      v_actual_closing_day
    );
  END IF;
  
  v_cycle_end := v_closing_date;
  v_cycle_start := (v_closing_date - INTERVAL '1 month')::DATE + INTERVAL '1 day';
  
  IF p_due_day <= p_closing_day THEN
    v_due_date := (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month')::DATE;
    v_days_in_month := EXTRACT(DAY FROM (v_due_date + INTERVAL '1 month - 1 day'));
    v_actual_due_day := LEAST(p_due_day, v_days_in_month);
    v_due_date := make_date(
      EXTRACT(YEAR FROM v_due_date)::INTEGER,
      EXTRACT(MONTH FROM v_due_date)::INTEGER,
      v_actual_due_day
    );
  ELSE
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
    v_actual_due_day := LEAST(p_due_day, v_days_in_month);
    v_due_date := make_date(
      EXTRACT(YEAR FROM v_closing_date)::INTEGER,
      EXTRACT(MONTH FROM v_closing_date)::INTEGER,
      v_actual_due_day
    );
  END IF;
  
  RETURN QUERY SELECT v_cycle_start, v_cycle_end, v_closing_date, v_due_date;
END;
$function$;