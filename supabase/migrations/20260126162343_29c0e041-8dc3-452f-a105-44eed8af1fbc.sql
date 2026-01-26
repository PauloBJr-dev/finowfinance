-- Enum para status de contas a pagar
CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'overdue');

-- Tabela bills (contas a pagar)
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES public.categories(id),
  due_date DATE NOT NULL,
  status bill_status NOT NULL DEFAULT 'pending',
  recurrence_group_id UUID,
  paid_at TIMESTAMPTZ,
  paid_transaction_id UUID REFERENCES public.transactions(id),
  account_id UUID REFERENCES public.accounts(id),
  payment_method payment_method,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own bills"
  ON public.bills FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can create own bills"
  ON public.bills FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update own bills"
  ON public.bills FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete own bills"
  ON public.bills FOR DELETE
  USING (user_id = get_current_user_id());

-- Trigger para updated_at
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para audit log
CREATE TRIGGER audit_bills
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Índices para performance
CREATE INDEX idx_bills_user_id ON public.bills(user_id);
CREATE INDEX idx_bills_due_date ON public.bills(due_date);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_recurrence ON public.bills(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;
CREATE INDEX idx_bills_deleted_at ON public.bills(deleted_at) WHERE deleted_at IS NULL;