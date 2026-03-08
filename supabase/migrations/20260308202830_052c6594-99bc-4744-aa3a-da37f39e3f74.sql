
-- Drop allow_coach_use_invoices column (invoices removed from app)
ALTER TABLE public.ai_settings DROP COLUMN IF EXISTS allow_coach_use_invoices;

-- Change persona_memory from JSONB to TEXT (encrypted value)
ALTER TABLE public.ai_settings ALTER COLUMN persona_memory DROP DEFAULT;
ALTER TABLE public.ai_settings ALTER COLUMN persona_memory DROP NOT NULL;
ALTER TABLE public.ai_settings ALTER COLUMN persona_memory TYPE TEXT USING CASE WHEN persona_memory::text = '{}' THEN NULL ELSE persona_memory::text END;
ALTER TABLE public.ai_settings ALTER COLUMN persona_memory SET DEFAULT NULL;
