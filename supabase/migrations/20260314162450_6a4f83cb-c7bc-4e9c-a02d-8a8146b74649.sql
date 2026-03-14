
-- 1. Remover funções/triggers antigos
DROP FUNCTION IF EXISTS public.update_invoice_total() CASCADE;
DROP FUNCTION IF EXISTS public.update_invoice_total_from_installments() CASCADE;

-- 2. Função de recálculo completo
CREATE OR REPLACE FUNCTION public.recalculate_invoice_total(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF p_invoice_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.invoice_id = p_invoice_id
        AND t.deleted_at IS NULL
        AND t.type = 'expense'
        AND NOT EXISTS (
          SELECT 1 FROM installment_groups ig WHERE ig.transaction_id = t.id
        )
    ), 0)
    +
    COALESCE((
      SELECT SUM(inst.amount)
      FROM installments inst
      JOIN installment_groups ig ON ig.id = inst.group_id
      JOIN transactions parent ON parent.id = ig.transaction_id
      WHERE inst.invoice_id = p_invoice_id
        AND parent.deleted_at IS NULL
    ), 0)
  INTO v_total;

  UPDATE invoices
  SET total_amount = v_total, updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_invoice_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_invoice_id := NEW.invoice_id;
    IF OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL THEN
      PERFORM recalculate_invoice_total(OLD.invoice_id);
    END IF;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  PERFORM recalculate_invoice_total(v_invoice_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Triggers na tabela transactions
CREATE TRIGGER trg_invoice_total_after_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invoice_total();

CREATE TRIGGER trg_invoice_total_after_update
  AFTER UPDATE OF amount, invoice_id, deleted_at, type ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invoice_total();

CREATE TRIGGER trg_invoice_total_after_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invoice_total();

-- 5. Triggers na tabela installments
CREATE TRIGGER trg_invoice_total_after_installment_insert
  AFTER INSERT ON installments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invoice_total();

CREATE TRIGGER trg_invoice_total_after_installment_update
  AFTER UPDATE OF amount, invoice_id ON installments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_invoice_total();
