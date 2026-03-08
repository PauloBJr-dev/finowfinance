ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS allow_coach_use_transactions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_coach_use_invoices boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_coach_use_goals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS store_conversations boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS persona_memory jsonb NOT NULL DEFAULT '{}'::jsonb;