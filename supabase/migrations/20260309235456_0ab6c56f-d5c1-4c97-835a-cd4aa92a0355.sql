
-- Reprocessar installments órfãs (sem invoice_id) e recalcular totais de faturas
-- Tudo em uma transação com rollback automático via DO block

DO $$
DECLARE
  r RECORD;
  v_invoice_id UUID;
  v_cycle RECORD;
  v_orphan_count INTEGER := 0;
  v_fixed_count INTEGER := 0;
  -- Para calcular a data de referência de cada parcela
  v_ref_date DATE;
BEGIN
  -- PARTE 1: Corrigir installments sem invoice_id
  FOR r IN
    SELECT 
      i.id AS installment_id,
      i.installment_number,
      ig.transaction_id,
      t.card_id,
      t.user_id,
      t.date AS transaction_date,
      c.billing_day,
      c.due_day
    FROM installments i
    JOIN installment_groups ig ON ig.id = i.group_id
    JOIN transactions t ON t.id = ig.transaction_id
    JOIN cards c ON c.id = t.card_id
    WHERE i.invoice_id IS NULL
      AND t.card_id IS NOT NULL
      AND t.deleted_at IS NULL
      AND c.deleted_at IS NULL
  LOOP
    v_orphan_count := v_orphan_count + 1;
    
    -- Calcular a data de referência: data da transação + (N-1) meses
    v_ref_date := r.transaction_date + ((r.installment_number - 1) || ' months')::INTERVAL;
    
    -- Usar calculate_invoice_cycle para determinar o ciclo correto
    SELECT * INTO v_cycle 
    FROM public.calculate_invoice_cycle(r.billing_day, r.due_day, v_ref_date);
    
    -- Buscar fatura existente com esse closing_date
    SELECT id INTO v_invoice_id
    FROM invoices
    WHERE card_id = r.card_id
      AND closing_date = v_cycle.closing_date
      AND deleted_at IS NULL
    LIMIT 1;
    
    -- Se não existir, criar a fatura
    IF v_invoice_id IS NULL THEN
      INSERT INTO invoices (
        card_id, user_id, cycle_start_date, cycle_end_date,
        closing_date, due_date, status, total_amount
      )
      VALUES (
        r.card_id, r.user_id, v_cycle.cycle_start_date, v_cycle.cycle_end_date,
        v_cycle.closing_date, v_cycle.due_date, 'open', 0
      )
      RETURNING id INTO v_invoice_id;
    END IF;
    
    -- Atualizar a parcela com o invoice_id correto
    UPDATE installments SET invoice_id = v_invoice_id WHERE id = r.installment_id;
    v_fixed_count := v_fixed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Installments órfãs encontradas: %, corrigidas: %', v_orphan_count, v_fixed_count;

  -- PARTE 2: Recalcular total_amount de TODAS as faturas
  -- Soma = transações diretas (sem installment_group) + installments vinculados
  UPDATE invoices inv
  SET total_amount = (
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.invoice_id = inv.id
        AND t.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM installment_groups ig WHERE ig.transaction_id = t.id
        )
    ), 0)
    +
    COALESCE((
      SELECT SUM(inst.amount)
      FROM installments inst
      WHERE inst.invoice_id = inv.id
    ), 0)
  ),
  updated_at = now()
  WHERE inv.deleted_at IS NULL;
  
  RAISE NOTICE 'Totais de faturas recalculados com sucesso';
END $$;
