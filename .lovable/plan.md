

## Rate Limiting nas Edge Functions

### Abordagem

Usar uma tabela `rate_limits` no banco para rastrear requisições por usuário (autenticado) e por IP (não autenticado), com janela deslizante de 1 minuto. Criar um módulo utilitário reutilizável que cada Edge Function importa.

### Limites propostos

| Contexto | Limite | Janela |
|---|---|---|
| Por usuário (autenticado) | 60 req | 1 minuto |
| Por IP (não autenticado, ex: /register) | 10 req | 1 minuto |
| Chat/IA (por usuário) | 20 req | 1 minuto |

### Implementação

**1. Migração SQL** — Criar tabela `rate_limits` + função RPC `check_rate_limit`

```sql
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,        -- user_id ou IP
  endpoint text NOT NULL,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Função SECURITY DEFINER que verifica/incrementa o contador
-- Retorna true se permitido, false se bloqueado
CREATE FUNCTION public.check_rate_limit(
  p_identifier text, p_endpoint text, p_max_requests int, p_window_seconds int
) RETURNS boolean ...
```

- Função atômica (UPSERT + verificação em uma query)
- Limpeza automática: reseta o contador quando a janela expira
- Sem RLS na tabela (acesso apenas via função SECURITY DEFINER)

**2. Integração nas Edge Functions**

Cada função chama `check_rate_limit` via `supabase.rpc()` logo após autenticação:

```typescript
// Após obter userId:
const { data: allowed } = await supabase.rpc('check_rate_limit', {
  p_identifier: userId,
  p_endpoint: 'transactions',
  p_max_requests: 60,
  p_window_seconds: 60
})
if (!allowed) {
  return new Response(JSON.stringify({ 
    error: 'Muitas requisições. Tente novamente em alguns segundos.' 
  }), { status: 429, headers: corsHeaders })
}
```

**3. Funções afetadas** (12 endpoints):

- `transactions` (60/min)
- `accounts` (60/min)
- `bills` (60/min)
- `profile` (30/min)
- `register` (10/min por IP)
- `upload-attachment` (20/min)
- `finow-chat` (20/min)
- `chat-messages` (20/min)
- `ai-categorize` (30/min)
- `ai-insights` (30/min)
- `personal-coach` (20/min)
- `reports` (10/min)

`secrets-gemini` e `ai-reminders` (cron) ficam de fora (uso interno/raro).

**4. Limpeza periódica**

Criar uma função SQL `cleanup_rate_limits()` que deleta registros com `window_start` > 5 minutos atrás. Pode ser chamada pelo mesmo cron do `ai-reminders` ou via pg_cron.

### Resultado

- Proteção contra abuso sem dependência de serviço externo
- Resposta `429 Too Many Requests` com mensagem amigável em PT-BR
- Sem impacto perceptível para uso normal (60 req/min é generoso)

