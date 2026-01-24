
# Plano de Correção: Criação de Contas e Cartões

## Diagnóstico Completo

### Causa Raiz Identificada
O usuário autenticado (`ae266eae-3e31-4f3f-acb0-4678a0664a6e`) **existe em `auth.users` mas NÃO possui um registro correspondente na tabela `profiles`**.

### Cronologia do Problema
| Evento | Data/Hora |
|--------|-----------|
| Usuário criado em `auth.users` | 2026-01-22 00:34:41 UTC |
| Primeira migration executada (criou tabelas + trigger) | 2026-01-23 01:01:27 UTC |

O usuário foi criado **aproximadamente 24 horas ANTES** da migration que criou o trigger `on_auth_user_created`. Como o trigger não existia no momento do signup, o perfil nunca foi criado automaticamente.

### Impacto em Cascata
As tabelas `accounts`, `cards`, `invoices`, `ai_settings`, etc., possuem **foreign keys apontando para `profiles(id)`**, não para `auth.users(id)`:

```
accounts.user_id     → profiles(id) ON DELETE CASCADE
cards.user_id        → profiles(id) ON DELETE CASCADE  
ai_settings.user_id  → profiles(id) ON DELETE CASCADE
invoices.user_id     → profiles(id) ON DELETE CASCADE
```

Sem o registro em `profiles`, qualquer INSERT nessas tabelas falha com:
```
violates foreign key constraint "xxx_user_id_fkey"
```

### Evidências dos Logs de Rede
```
POST /rest/v1/ai_settings → 409
"insert or update on table 'ai_settings' violates foreign key constraint 'ai_settings_user_id_fkey'"
"Key is not present in table 'profiles'"
```

---

## Solução

### Fase 1: Correção de Dados (Migration)
Criar uma migration que:

1. **Insere perfis para usuários órfãos** - Busca todos os usuários em `auth.users` que não possuem registro em `profiles` e cria os perfis automaticamente usando os metadados disponíveis.

```sql
INSERT INTO public.profiles (id, name, phone)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', ''),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### Fase 2: Proteção Futura (Migration)
Alterar a função `handle_new_user` para usar `ON CONFLICT DO NOTHING`, evitando erros caso o trigger seja executado novamente para o mesmo usuário:

```sql
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
```

### Fase 3: Validação
Após a correção, o sistema automaticamente:
- Permitirá criação de contas financeiras
- Permitirá criação de cartões de crédito
- Permitirá criação de configurações de IA
- Todas as FKs serão satisfeitas

---

## Detalhes Técnicos

### Por que NÃO alterar as FKs?
O design atual (`user_id → profiles(id)`) é **correto**:
- Permite armazenar dados extras do usuário (nome, telefone, timezone)
- Evita queries diretas ao schema `auth` que é protegido
- Segue o padrão recomendado pelo Supabase

### O que NÃO será alterado
- Nenhuma regra de negócio
- Nenhuma policy RLS (já estão corretas)
- Nenhum código frontend ou hooks
- Nenhuma Edge Function

### Arquivos que serão criados
| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/[timestamp]_fix_orphan_profiles.sql` | Migration para criar perfis órfãos e melhorar o trigger |

---

## Resultado Esperado

Após a execução da migration:

1. O usuário `ae266eae-3e31-4f3f-acb0-4678a0664a6e` terá um registro em `profiles`
2. Qualquer futuro usuário sem perfil também será corrigido
3. O trigger impedirá que o problema ocorra novamente
4. As operações de criação de contas e cartões funcionarão normalmente
