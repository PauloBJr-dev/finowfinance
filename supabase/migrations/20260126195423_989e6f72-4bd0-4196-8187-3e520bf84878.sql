-- Adicionar coluna deleted_at à tabela invoices para suporte a soft delete
ALTER TABLE public.invoices ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Criar trigger para soft delete em cascata das faturas quando cartão for soft deleted
CREATE OR REPLACE FUNCTION public.cascade_card_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quando um cartão é soft deleted, soft delete todas as suas faturas
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.invoices
    SET deleted_at = NEW.deleted_at
    WHERE card_id = NEW.id AND deleted_at IS NULL;
  END IF;
  
  -- Quando um cartão é restaurado, restaurar todas as suas faturas
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE public.invoices
    SET deleted_at = NULL
    WHERE card_id = NEW.id AND deleted_at IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa a função
CREATE TRIGGER trigger_cascade_card_soft_delete
AFTER UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.cascade_card_soft_delete();