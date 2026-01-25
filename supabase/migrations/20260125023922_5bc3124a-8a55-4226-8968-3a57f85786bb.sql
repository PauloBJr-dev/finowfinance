-- =====================================================
-- SISTEMA DE FATURAS COM CICLO BANCÁRIO REAL
-- =====================================================

-- 1. Renomear colunas para clareza semântica
ALTER TABLE invoices RENAME COLUMN start_date TO cycle_start_date;
ALTER TABLE invoices RENAME COLUMN end_date TO cycle_end_date;
ALTER TABLE invoices RENAME COLUMN reference_month TO closing_date;

-- 2. Criar função para calcular o ciclo correto de uma fatura
-- Dado um closing_day e uma data de transação, retorna as datas do ciclo
CREATE OR REPLACE FUNCTION public.calculate_invoice_cycle(
  p_closing_day INTEGER,
  p_due_day INTEGER,
  p_transaction_date DATE
)
RETURNS TABLE (
  cycle_start_date DATE,
  cycle_end_date DATE,
  closing_date DATE,
  due_date DATE
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
  
  -- Calcular o dia de fechamento real (ajustando para meses com menos dias)
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month - 1 day'));
  v_actual_closing_day := LEAST(p_closing_day, v_days_in_month);
  
  -- Data de fechamento do mês atual
  v_closing_date := make_date(v_year, v_month, v_actual_closing_day);
  
  -- Verificar se a transação é APÓS o fechamento
  -- Se sim, vai para o ciclo do PRÓXIMO mês
  IF p_transaction_date > v_closing_date THEN
    -- Avançar para o próximo mês
    v_closing_date := v_closing_date + INTERVAL '1 month';
    -- Recalcular para o novo mês
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_closing_date) + INTERVAL '1 month - 1 day'));
    v_actual_closing_day := LEAST(p_closing_day, v_days_in_month);
    v_closing_date := make_date(
      EXTRACT(YEAR FROM v_closing_date)::INTEGER, 
      EXTRACT(MONTH FROM v_closing_date)::INTEGER, 
      v_actual_closing_day
    );
  END IF;
  
  -- Ciclo: do dia após fechamento anterior até o dia de fechamento atual
  v_cycle_end := v_closing_date;
  v_cycle_start := (v_closing_date - INTERVAL '1 month')::DATE + INTERVAL '1 day';
  
  -- Calcular data de vencimento
  -- Se due_day < closing_day, vencimento é no mês seguinte ao fechamento
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
    -- Vencimento no mesmo mês do fechamento
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
$$;

-- 3. Criar função para encontrar ou criar fatura correta
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
  
  -- Calcular ciclo correto para a data da transação
  SELECT * INTO v_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  -- Buscar fatura existente para este ciclo
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND closing_date = v_cycle.closing_date
  LIMIT 1;
  
  -- Se não existe, criar
  IF v_invoice_id IS NULL THEN
    INSERT INTO invoices (
      card_id, user_id, cycle_start_date, cycle_end_date, 
      closing_date, due_date, status, total_amount
    )
    VALUES (
      p_card_id, p_user_id, v_cycle.cycle_start_date, v_cycle.cycle_end_date,
      v_cycle.closing_date, v_cycle.due_date, 'open', 0
    )
    RETURNING id INTO v_invoice_id;
  ELSE
    -- Verificar se a fatura está fechada
    IF EXISTS (SELECT 1 FROM invoices WHERE id = v_invoice_id AND status IN ('closed', 'paid')) THEN
      -- Buscar ou criar a próxima fatura aberta
      SELECT * INTO v_next_cycle 
      FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_cycle.closing_date + INTERVAL '1 day');
      
      SELECT id INTO v_invoice_id
      FROM invoices
      WHERE card_id = p_card_id
        AND closing_date = v_next_cycle.closing_date
        AND status = 'open'
      LIMIT 1;
      
      IF v_invoice_id IS NULL THEN
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
    END IF;
  END IF;
  
  RETURN v_invoice_id;
END;
$$;

-- 4. Função para fechamento automático de faturas
CREATE OR REPLACE FUNCTION public.close_due_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE invoices
  SET status = 'closed', updated_at = now()
  WHERE status = 'open'
    AND closing_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. LIMPAR E RECALCULAR DADOS EXISTENTES
-- 5.1 Desvincular todas as transações de cartão das faturas antigas
UPDATE transactions
SET invoice_id = NULL, updated_at = now()
WHERE payment_method = 'credit_card'
  AND card_id IS NOT NULL;

-- 5.2 Deletar todas as faturas existentes (recalcular do zero)
DELETE FROM invoices;

-- 5.3 Recriar faturas baseadas nas transações existentes
DO $$
DECLARE
  r RECORD;
  v_invoice_id UUID;
BEGIN
  FOR r IN 
    SELECT DISTINCT t.card_id, t.user_id, t.date, t.id as transaction_id
    FROM transactions t
    WHERE t.payment_method = 'credit_card'
      AND t.card_id IS NOT NULL
      AND t.deleted_at IS NULL
    ORDER BY t.date ASC
  LOOP
    -- Encontrar ou criar a fatura correta
    v_invoice_id := find_or_create_invoice(r.card_id, r.user_id, r.date);
    
    -- Vincular a transação
    UPDATE transactions
    SET invoice_id = v_invoice_id, updated_at = now()
    WHERE id = r.transaction_id;
  END LOOP;
END;
$$;

-- 5.4 Recalcular totais das faturas
UPDATE invoices i
SET total_amount = COALESCE((
  SELECT SUM(t.amount)
  FROM transactions t
  WHERE t.invoice_id = i.id
    AND t.deleted_at IS NULL
), 0),
updated_at = now();

-- 5.5 Fechar faturas cujo ciclo já passou
SELECT close_due_invoices();

-- 5.6 Recalcular saldos das contas
UPDATE accounts a
SET current_balance = a.initial_balance + COALESCE((
  SELECT SUM(
    CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
  )
  FROM transactions t
  WHERE t.account_id = a.id
    AND t.deleted_at IS NULL
    AND t.payment_method != 'credit_card'
), 0),
updated_at = now();