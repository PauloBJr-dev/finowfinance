-- Deletar usuários do auth schema
DELETE FROM auth.users WHERE id IN (
  'ae266eae-3e31-4f3f-acb0-4678a0664a6e',
  '35b5ac1e-37b2-4f75-8422-856d4fe25cc2'
);
