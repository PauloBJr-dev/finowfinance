-- Tabela para rastrear consumo de tokens de IA
CREATE TABLE public.ai_token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'categorization', 'reminders', etc.
  tokens_used INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Índice único para agregação diária por usuário/agente
  CONSTRAINT unique_user_agent_date UNIQUE (user_id, agent_name, date)
);

-- Habilitar RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own AI usage"
  ON public.ai_token_usage
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "System can insert AI usage"
  ON public.ai_token_usage
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "System can update AI usage"
  ON public.ai_token_usage
  FOR UPDATE
  USING (user_id = get_current_user_id());

-- Índices para consultas de governança
CREATE INDEX idx_ai_token_usage_user_date ON public.ai_token_usage(user_id, date);
CREATE INDEX idx_ai_token_usage_agent_date ON public.ai_token_usage(agent_name, date);

-- Tabela para lembretes in-app
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'invoice_due', 'invoice_closed', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data_points JSONB DEFAULT '{}', -- Dados usados para gerar o reminder
  related_entity_type TEXT, -- 'invoice', 'transaction', etc.
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own reminders"
  ON public.reminders
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can update own reminders"
  ON public.reminders
  FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "System can insert reminders"
  ON public.reminders
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can delete own reminders"
  ON public.reminders
  FOR DELETE
  USING (user_id = get_current_user_id());

-- Índices para consultas de reminders
CREATE INDEX idx_reminders_user_read ON public.reminders(user_id, is_read) WHERE dismissed_at IS NULL;
CREATE INDEX idx_reminders_user_date ON public.reminders(user_id, created_at DESC);

-- Tabela para configurações de IA do usuário
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  categorization_enabled BOOLEAN NOT NULL DEFAULT true,
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_token_limit INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own AI settings"
  ON public.ai_settings
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can update own AI settings"
  ON public.ai_settings
  FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can insert own AI settings"
  ON public.ai_settings
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- Trigger para updated_at
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar settings padrão ao criar usuário
CREATE OR REPLACE FUNCTION public.create_default_ai_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.ai_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para criar settings padrão
CREATE TRIGGER trigger_create_default_ai_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_ai_settings();