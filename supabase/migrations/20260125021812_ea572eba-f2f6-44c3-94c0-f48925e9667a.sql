-- =====================================================
-- FASE 3: Corrigir trigger de auditoria para tabelas sem deleted_at
-- FASE 5: Corrigir dados existentes (vincular transações, recalcular totais)
-- =====================================================

-- 1. Atualizar função de auditoria para verificar existência de deleted_at
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action audit_action;
  v_old_value JSONB;
  v_new_value JSONB;
  v_old_deleted_at TIMESTAMP;
  v_new_deleted_at TIMESTAMP;
BEGIN
  -- Determinar user_id
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Determinar ação
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_value := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar soft delete/restore de forma segura usando JSONB
    v_old_deleted_at := (to_jsonb(OLD)->>'deleted_at')::TIMESTAMP;
    v_new_deleted_at := (to_jsonb(NEW)->>'deleted_at')::TIMESTAMP;
    
    IF v_old_deleted_at IS NULL AND v_new_deleted_at IS NOT NULL THEN
      v_action := 'delete';
    ELSIF v_old_deleted_at IS NOT NULL AND v_new_deleted_at IS NULL THEN
      v_action := 'restore';
    ELSE
      v_action := 'update';
    END IF;
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_value := to_jsonb(OLD);
  END IF;

  -- Inserir log (ignorar erros silenciosamente para não bloquear operações)
  BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_user_id, v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old_value, v_new_value);
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block the operation
    RAISE WARNING 'Audit log failed for %: %', TG_TABLE_NAME, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Vincular transações de cartão às faturas corretas
UPDATE transactions t
SET invoice_id = (
  SELECT i.id FROM invoices i
  WHERE i.card_id = t.card_id
  AND i.status = 'open'
  ORDER BY i.reference_month ASC
  LIMIT 1
)
WHERE t.payment_method = 'credit_card'
AND t.card_id IS NOT NULL
AND t.invoice_id IS NULL
AND t.deleted_at IS NULL;

-- 3. Recalcular totais das faturas baseado em transações vinculadas
UPDATE invoices i
SET total_amount = COALESCE((
  SELECT SUM(t.amount)
  FROM transactions t
  WHERE t.invoice_id = i.id
  AND t.deleted_at IS NULL
), 0),
updated_at = now();

-- 4. Recalcular saldos das contas (baseado em initial_balance + transações)
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