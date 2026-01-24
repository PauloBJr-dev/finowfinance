-- Fase 1: Inserir perfis para usuários órfãos (existem em auth.users mas não em profiles)
INSERT INTO public.profiles (id, name, phone)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', ''),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Fase 2: Atualizar função handle_new_user para usar ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;