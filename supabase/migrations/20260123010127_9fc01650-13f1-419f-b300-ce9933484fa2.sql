-- =============================================
-- FINOW - Schema Completo do Banco de Dados
-- =============================================

-- 1. ENUMS (Tipos Customizados)
-- =============================================

CREATE TYPE transaction_type AS ENUM ('expense', 'income');
CREATE TYPE payment_method AS ENUM ('cash', 'debit', 'transfer', 'boleto', 'credit_card', 'voucher', 'split');
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'cash', 'benefit_card', 'investment');
CREATE TYPE invoice_status AS ENUM ('open', 'closed', 'paid', 'overdue');
CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'reconciled');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'restore');

-- 2. HELPER FUNCTION (evita recursão em RLS)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT auth.uid() $$;

-- 3. TABELAS
-- =============================================

-- 3.1 profiles (extensão do auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 accounts (contas bancárias e carteiras)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  include_in_net_worth BOOLEAN NOT NULL DEFAULT true,
  track_balance BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 cards (cartões de crédito)
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credit_limit NUMERIC(15,2) NOT NULL,
  billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 categories (categorias de transação)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  icon TEXT,
  color TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 invoices (faturas de cartão) - criada antes de transactions
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'open',
  paid_at TIMESTAMPTZ,
  paid_from_account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 transactions (transações financeiras)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  type transaction_type NOT NULL,
  payment_method payment_method NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  event_id UUID,
  tags TEXT[] NOT NULL DEFAULT '{}',
  attachments TEXT[] NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 installment_groups (grupos de parcelamento)
CREATE TABLE public.installment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  total_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 installments (parcelas individuais)
CREATE TABLE public.installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.installment_groups(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  amount NUMERIC(15,2) NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  status installment_status NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 goals (metas financeiras)
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deadline DATE,
  status goal_status NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.10 piggy_bank (cofrinho)
CREATE TABLE public.piggy_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  goal_amount NUMERIC(15,2),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.11 audit_logs (log de auditoria)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar FK que dependem de outras tabelas
ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE,
  ADD CONSTRAINT invoices_paid_from_account_id_fkey FOREIGN KEY (paid_from_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 4. ÍNDICES
-- =============================================

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cards_user_id ON public.cards(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_user_id ON public.categories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_date ON public.transactions(date) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_card_id ON public.transactions(card_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_invoice_id ON public.transactions(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_installments_group_id ON public.installments(group_id);
CREATE INDEX idx_installments_invoice_id ON public.installments(invoice_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_card_id ON public.invoices(card_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_goals_user_id ON public.goals(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_piggy_bank_user_id ON public.piggy_bank(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- 5. TRIGGERS - Updated At
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_piggy_bank_updated_at BEFORE UPDATE ON public.piggy_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. TRIGGER - Criar Profile automaticamente
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. TRIGGER - Audit Log
-- =============================================

CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action audit_action;
  v_old_value JSONB;
  v_new_value JSONB;
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
    -- Verificar se é soft delete ou restore
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'delete';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
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

  -- Inserir log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old_value, v_new_value);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger de auditoria em tabelas sensíveis
CREATE TRIGGER audit_accounts AFTER INSERT OR UPDATE OR DELETE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_cards AFTER INSERT OR UPDATE OR DELETE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_goals AFTER INSERT OR UPDATE OR DELETE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();
CREATE TRIGGER audit_piggy_bank AFTER INSERT OR UPDATE OR DELETE ON public.piggy_bank FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- 8. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggy_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.1 profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = public.get_current_user_id());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = public.get_current_user_id());

-- 8.2 accounts
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own accounts" ON public.accounts FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (user_id = public.get_current_user_id());

-- 8.3 cards
CREATE POLICY "Users can view own cards" ON public.cards FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own cards" ON public.cards FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own cards" ON public.cards FOR UPDATE USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can delete own cards" ON public.cards FOR DELETE USING (user_id = public.get_current_user_id());

-- 8.4 categories (inclui categorias do sistema)
CREATE POLICY "Users can view own and system categories" ON public.categories FOR SELECT USING (user_id = public.get_current_user_id() OR is_system = true);
CREATE POLICY "Users can create own categories" ON public.categories FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (user_id = public.get_current_user_id() AND is_system = false);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (user_id = public.get_current_user_id() AND is_system = false);

-- 8.5 transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (user_id = public.get_current_user_id());

-- 8.6 installment_groups
CREATE POLICY "Users can view own installment groups" ON public.installment_groups FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own installment groups" ON public.installment_groups FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- 8.7 installments (via join com group)
CREATE POLICY "Users can view own installments" ON public.installments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.installment_groups WHERE id = installments.group_id AND user_id = public.get_current_user_id())
);
CREATE POLICY "Users can create own installments" ON public.installments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.installment_groups WHERE id = installments.group_id AND user_id = public.get_current_user_id())
);
CREATE POLICY "Users can update own installments" ON public.installments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.installment_groups WHERE id = installments.group_id AND user_id = public.get_current_user_id())
);

-- 8.8 invoices
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own invoices" ON public.invoices FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (user_id = public.get_current_user_id());

-- 8.9 goals
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own goals" ON public.goals FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (user_id = public.get_current_user_id());

-- 8.10 piggy_bank
CREATE POLICY "Users can view own piggy banks" ON public.piggy_bank FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create own piggy banks" ON public.piggy_bank FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Users can update own piggy banks" ON public.piggy_bank FOR UPDATE USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can delete own piggy banks" ON public.piggy_bank FOR DELETE USING (user_id = public.get_current_user_id());

-- 8.11 audit_logs (somente leitura)
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (user_id = public.get_current_user_id());

-- 9. CATEGORIAS PADRÃO DO SISTEMA
-- =============================================

INSERT INTO public.categories (name, type, icon, color, is_system) VALUES
-- Despesas
('Alimentação', 'expense', 'utensils', '#EF4444', true),
('Transporte', 'expense', 'car', '#F97316', true),
('Moradia', 'expense', 'home', '#EAB308', true),
('Saúde', 'expense', 'heart-pulse', '#22C55E', true),
('Educação', 'expense', 'graduation-cap', '#3B82F6', true),
('Lazer', 'expense', 'gamepad-2', '#8B5CF6', true),
('Compras', 'expense', 'shopping-bag', '#EC4899', true),
('Serviços', 'expense', 'wrench', '#6B7280', true),
('Outros', 'expense', 'more-horizontal', '#9CA3AF', true),
-- Receitas
('Salário', 'income', 'briefcase', '#10B981', true),
('Freelance', 'income', 'laptop', '#14B8A6', true),
('Investimentos', 'income', 'trending-up', '#06B6D4', true),
('Presente', 'income', 'gift', '#F472B6', true),
('Outros', 'income', 'plus-circle', '#6B7280', true);