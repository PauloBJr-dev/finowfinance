-- =============================================================================
-- BENEFIT DEPOSITS TABLE - Histórico de recargas de cartões benefício
-- =============================================================================

-- 1. Criar tabela de depósitos de benefícios
CREATE TABLE public.benefit_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  working_days INTEGER NOT NULL DEFAULT 22 CHECK (working_days > 0 AND working_days <= 31),
  daily_rate NUMERIC(15,2) GENERATED ALWAYS AS (amount / NULLIF(working_days, 0)) STORED,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Índices para performance
CREATE INDEX idx_benefit_deposits_user_id ON public.benefit_deposits(user_id);
CREATE INDEX idx_benefit_deposits_account_id ON public.benefit_deposits(account_id);
CREATE INDEX idx_benefit_deposits_date ON public.benefit_deposits(date);
CREATE INDEX idx_benefit_deposits_deleted_at ON public.benefit_deposits(deleted_at) WHERE deleted_at IS NULL;

-- 3. Enable RLS
ALTER TABLE public.benefit_deposits ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own benefit deposits"
  ON public.benefit_deposits FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can create own benefit deposits"
  ON public.benefit_deposits FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update own benefit deposits"
  ON public.benefit_deposits FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete own benefit deposits"
  ON public.benefit_deposits FOR DELETE
  USING (user_id = get_current_user_id());

-- =============================================================================
-- TRIGGER: Ao inserir depósito, criar transação de receita e atualizar saldo
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_benefit_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- INSERT: criar transação de receita e atualizar saldo da conta
  IF TG_OP = 'INSERT' THEN
    -- Buscar ou criar categoria de receita "Vale Alimentação/Refeição"
    SELECT id INTO v_category_id
    FROM categories
    WHERE name = 'Vale Alimentação/Refeição' AND type = 'income' AND is_system = true
    LIMIT 1;
    
    -- Se não existir, criar categoria do sistema
    IF v_category_id IS NULL THEN
      INSERT INTO categories (name, type, icon, color, is_system)
      VALUES ('Vale Alimentação/Refeição', 'income', 'Wallet', '#22c55e', true)
      RETURNING id INTO v_category_id;
    END IF;
    
    -- Criar transação de receita
    INSERT INTO transactions (
      user_id,
      account_id,
      amount,
      type,
      payment_method,
      date,
      description,
      category_id
    )
    VALUES (
      NEW.user_id,
      NEW.account_id,
      NEW.amount,
      'income',
      'transfer', -- Depósito via transferência
      NEW.date,
      COALESCE(NEW.description, 'Crédito de Vale Alimentação/Refeição'),
      v_category_id
    );
    
    -- O trigger update_account_balance já cuida de atualizar o saldo
    RETURN NEW;
  END IF;
  
  -- UPDATE: se valor mudou, ajustar (reverter antigo, aplicar novo)
  IF TG_OP = 'UPDATE' THEN
    -- Se foi soft-deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Reverter saldo
      UPDATE accounts
      SET current_balance = current_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Se foi restaurado
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Restaurar saldo
      UPDATE accounts
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger para benefit_deposits
CREATE TRIGGER trigger_handle_benefit_deposit
  AFTER INSERT OR UPDATE ON public.benefit_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_benefit_deposit();

-- =============================================================================
-- AUDIT LOG para benefit_deposits
-- =============================================================================

CREATE TRIGGER audit_benefit_deposits
  AFTER INSERT OR UPDATE OR DELETE ON public.benefit_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log();