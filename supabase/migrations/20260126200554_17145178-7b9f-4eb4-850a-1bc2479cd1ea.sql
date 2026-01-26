
-- Corrigir função find_or_create_invoice para distribuir parcelas corretamente
-- A função atual sempre retorna a primeira fatura 'open', ignorando a data da transação
-- Isso causa bug onde todas as parcelas vão para a mesma fatura

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
BEGIN
  -- Buscar configurações do cartão
  SELECT billing_day, due_day INTO v_closing_day, v_due_day
  FROM cards WHERE id = p_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado: %', p_card_id;
  END IF;
  
  -- Calcular o ciclo correto baseado na DATA DA TRANSAÇÃO/PARCELA
  -- Este é o passo crucial: respeitar a data para distribuir parcelas corretamente
  SELECT * INTO v_cycle 
  FROM calculate_invoice_cycle(v_closing_day, v_due_day, p_transaction_date);
  
  -- Buscar fatura existente para este ciclo específico
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE card_id = p_card_id
    AND closing_date = v_cycle.closing_date
    AND deleted_at IS NULL
  LIMIT 1;
  
  -- Se existe fatura para este ciclo
  IF v_invoice_id IS NOT NULL THEN
    -- Se está open, usar ela
    IF EXISTS (SELECT 1 FROM invoices WHERE id = v_invoice_id AND status = 'open') THEN
      RETURN v_invoice_id;
    END IF;
    
    -- Se está closed ou paid, criar fatura do próximo ciclo
    -- Isso acontece quando a fatura da data original já fechou
    SELECT * INTO v_cycle 
    FROM calculate_invoice_cycle(v_closing_day, v_due_day, v_cycle.closing_date + INTERVAL '1 day');
    
    -- Verificar se a fatura do próximo ciclo já existe
    SELECT id INTO v_invoice_id
    FROM invoices
    WHERE card_id = p_card_id
      AND closing_date = v_cycle.closing_date
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_invoice_id IS NOT NULL THEN
      RETURN v_invoice_id;
    END IF;
    
    -- Criar fatura do próximo ciclo
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
  END IF;
  
  -- Não existe fatura para este ciclo, criar nova
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

-- Verificar e corrigir o trigger de atualização de total da fatura para parcelas
-- Esse trigger deve somar apenas as parcelas vinculadas à fatura

CREATE OR REPLACE FUNCTION public.update_invoice_total_from_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ao inserir parcela, atualizar total da fatura correspondente
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM installments
      WHERE invoice_id = NEW.invoice_id
    ),
    updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  
  -- Ao atualizar parcela (mudança de invoice_id ou amount)
  IF TG_OP = 'UPDATE' THEN
    -- Recalcular fatura antiga
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM installments
        WHERE invoice_id = OLD.invoice_id
      ),
      updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    
    -- Recalcular fatura nova
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM installments
        WHERE invoice_id = NEW.invoice_id
      ),
      updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  
  -- Ao deletar parcela
  IF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    UPDATE invoices 
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM installments
      WHERE invoice_id = OLD.invoice_id
    ),
    updated_at = now()
    WHERE id = OLD.invoice_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recriar trigger se não existir
DROP TRIGGER IF EXISTS trigger_update_invoice_total_from_installments ON installments;
CREATE TRIGGER trigger_update_invoice_total_from_installments
  AFTER INSERT OR UPDATE OR DELETE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total_from_installments();

-- IMPORTANTE: O trigger de update_invoice_total (para transações) deve IGNORAR transações parceladas
-- Verificar se a transação tem installment_group associado

CREATE OR REPLACE FUNCTION public.update_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_installments BOOLEAN;
BEGIN
  -- Verificar se esta transação tem parcelamento (não deve afetar invoice total diretamente)
  SELECT EXISTS(
    SELECT 1 FROM installment_groups WHERE transaction_id = COALESCE(NEW.id, OLD.id)
  ) INTO v_has_installments;
  
  -- Se tem parcelamento, ignorar - o trigger de installments cuida disso
  IF v_has_installments THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Lógica normal para transações à vista
  IF TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE invoices 
    SET total_amount = total_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Reverter valor antigo se tinha invoice
    IF OLD.invoice_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount - OLD.amount,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    
    -- Adicionar novo valor se tem invoice e não está deletado
    IF NEW.invoice_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount + NEW.amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE invoices 
    SET total_amount = total_amount - OLD.amount,
        updated_at = now()
    WHERE id = OLD.invoice_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;
