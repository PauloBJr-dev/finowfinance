-- Função para atualizar saldo da conta automaticamente
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount_change numeric;
  v_account_id uuid;
  v_old_amount numeric;
  v_old_account_id uuid;
BEGIN
  -- Ignorar transações de cartão de crédito (não afetam saldo da conta diretamente)
  IF TG_OP = 'INSERT' AND NEW.payment_method = 'credit_card' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.payment_method = 'credit_card' AND OLD.payment_method = 'credit_card' THEN
    RETURN NEW;
  END IF;

  -- INSERT: adicionar ao saldo
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_amount_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
      
      UPDATE accounts 
      SET current_balance = current_balance + v_amount_change,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: recalcular diferença
  IF TG_OP = 'UPDATE' THEN
    -- Se estava soft-deleted e continua, ignorar
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Se foi restaurado (deleted_at NULL agora)
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      IF NEW.account_id IS NOT NULL AND NEW.payment_method != 'credit_card' THEN
        v_amount_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
        UPDATE accounts 
        SET current_balance = current_balance + v_amount_change,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Se foi soft-deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      IF OLD.account_id IS NOT NULL AND OLD.payment_method != 'credit_card' THEN
        v_amount_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
        UPDATE accounts 
        SET current_balance = current_balance + v_amount_change,
            updated_at = now()
        WHERE id = OLD.account_id;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Atualização normal: reverter antigo, aplicar novo
    -- Reverter valor antigo
    IF OLD.account_id IS NOT NULL AND OLD.payment_method != 'credit_card' THEN
      v_amount_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
      UPDATE accounts 
      SET current_balance = current_balance + v_amount_change,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Aplicar novo valor
    IF NEW.account_id IS NOT NULL AND NEW.payment_method != 'credit_card' THEN
      v_amount_change := CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
      UPDATE accounts 
      SET current_balance = current_balance + v_amount_change,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- DELETE: reverter do saldo
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL AND OLD.deleted_at IS NULL AND OLD.payment_method != 'credit_card' THEN
      v_amount_change := CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
      UPDATE accounts 
      SET current_balance = current_balance + v_amount_change,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar trigger para atualização automática de saldo
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Função para atualizar total da fatura automaticamente
CREATE OR REPLACE FUNCTION public.update_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: adicionar ao total da fatura
  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount + NEW.amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Se estava soft-deleted e continua, ignorar
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Se foi restaurado
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      IF NEW.invoice_id IS NOT NULL THEN
        UPDATE invoices 
        SET total_amount = total_amount + NEW.amount,
            updated_at = now()
        WHERE id = NEW.invoice_id;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Se foi soft-deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      IF OLD.invoice_id IS NOT NULL THEN
        UPDATE invoices 
        SET total_amount = total_amount - OLD.amount,
            updated_at = now()
        WHERE id = OLD.invoice_id;
      END IF;
      RETURN NEW;
    END IF;
    
    -- Atualização normal
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount - OLD.amount,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount + NEW.amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount - OLD.amount,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar trigger para atualização automática do total da fatura
DROP TRIGGER IF EXISTS trigger_update_invoice_total ON transactions;
CREATE TRIGGER trigger_update_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total();

-- Função para atualizar total da fatura baseado em installments
CREATE OR REPLACE FUNCTION public.update_invoice_total_from_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: adicionar ao total da fatura
  IF TG_OP = 'INSERT' THEN
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount + NEW.amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Reverter antigo
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount - OLD.amount,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    
    -- Aplicar novo
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount + NEW.amount,
          updated_at = now()
      WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      UPDATE invoices 
      SET total_amount = total_amount - OLD.amount,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar trigger para parcelas
DROP TRIGGER IF EXISTS trigger_update_invoice_from_installments ON installments;
CREATE TRIGGER trigger_update_invoice_from_installments
  AFTER INSERT OR UPDATE OR DELETE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total_from_installments();

-- Criar categoria de sistema para Pagamento de Fatura se não existir
INSERT INTO categories (name, type, is_system, icon, color)
SELECT 'Pagamento de Fatura', 'expense', true, 'credit-card', '#6366f1'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Pagamento de Fatura' AND is_system = true
);