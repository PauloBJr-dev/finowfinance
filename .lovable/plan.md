

## Plano: Fase 2 — Notificações Inteligentes

### 1. Edge Function `ai-anomaly/index.ts` (NOVA)

- `verify_jwt = true` em config.toml (chamada do frontend com JWT)
- Recebe `{ transaction_id }`, extrai userId via `getUser()`
- Busca `ai_settings` → se `allow_coach_use_transactions = false` → return 200 no-op
- Busca a transação (deve ser expense com category_id)
- Busca transações da mesma categoria nos últimos 3 meses (excluindo a atual)
- Se < 10 históricas → return 200 no-op
- Calcula média por transação e total do mês anterior na categoria
- Condição A: valor > 2x média → flag
- Condição B: total mês atual na categoria > 80% mês anterior → flag
- Se flagged: chama Lovable AI Gateway (gemini-3-flash-preview, max_tokens: 500) para gerar título + mensagem PT-BR casual
- Verifica duplicata: não criar se já existe `anomaly_spending` + mesmo `related_entity_id` não dispensado
- Insere em `reminders` (type: `anomaly_spending`, expires_at: +7d) usando service_role client
- Registra em `ai_token_usage` (agent_name: `anomaly`)

### 2. Edge Function `ai-goals-check/index.ts` (NOVA)

- `verify_jwt = false` em config.toml
- Valida `x-cron-secret` no início (padrão igual a `ai-reminders`)
- Usa service_role para iterar todos os usuários com `allow_coach_use_goals = true`
- Para cada goal ativo:
  - **Caso A** (atingida): `current_amount >= target_amount` → gera notificação `goal_achieved`
  - **Caso B** (em risco): deadline ≤ 30 dias E progresso < 60% → gera notificação `goal_at_risk`
- Verifica duplicata: mesmo type + related_entity_id + is_read=false nas últimas 24h
- Chama IA (max_tokens: 300) para título/mensagem
- Registra tokens (agent_name: `goals_check`)

### 3. Edge Function `ai-savings-suggestion/index.ts` (NOVA)

- `verify_jwt = false` em config.toml
- Valida `x-cron-secret` no início
- Usa service_role para iterar todos os usuários com `allow_coach_use_transactions = true`
- Calcula receitas - despesas do mês atual
- Se saldo ≤ 0 → skip
- Verifica duplicata: `savings_suggestion` no mês atual
- Chama IA (max_tokens: 200) para sugerir guardar ~20%
- Insere reminder (type: `savings_suggestion`, expires_at: fim do mês)
- Registra tokens (agent_name: `savings_suggestion`)

### 4. Cron Jobs (SQL insert, não migração)

```text
A) ai-goals-check: '0 12 * * *' (UTC = 09:00 BRT)
B) ai-savings-suggestion: '0 13 25 * *' (UTC = 10:00 BRT dia 25)
```

Ambos com header `x-cron-secret` usando `CRON_SECRET` existente.

### 5. `use-transactions.ts` — fire-and-forget anomaly

No `onSuccess` de `useCreateTransaction`, adicionar:

```typescript
supabase.functions.invoke('ai-anomaly', { body: { transaction_id: data.id } })
```

Sem `await`, não bloqueia.

### 6. `use-ai.ts` — ajustes

- Adicionar `refetchInterval: 60000` ao `useUnreadRemindersCount` (polling 60s)
- Adicionar `useMarkAllRemindersRead` mutation
- `useUnreadRemindersCount` já existe e funciona corretamente

### 7. `NotificationCenter.tsx` (NOVO)

- Ícone Bell no header com badge de contagem (usa `useUnreadRemindersCount`)
- Abre Sheet lateral com lista agrupada (Hoje / Esta semana / Anteriores)
- Ícones por type: AlertTriangle (anomaly), Target (goals), PiggyBank (savings), Bell (outros)
- Clique: marca como lida + navega:
  - `anomaly_spending` → `/transacoes?highlight={related_entity_id}`
  - `goal_achieved` / `goal_at_risk` → `/metas`
  - Outros → apenas marca como lida
- Botão "Marcar todas como lidas"
- Botão dismiss (X) individual → preenche `dismissed_at`

### 8. `MainLayout.tsx` — header com NotificationCenter

Adicionar barra de header fixa no topo da `<main>` com o componente `NotificationCenter` alinhado à direita.

### 9. config.toml

Adicionar:
```toml
[functions.ai-anomaly]
verify_jwt = true

[functions.ai-goals-check]
verify_jwt = false

[functions.ai-savings-suggestion]
verify_jwt = false
```

### Arquivos criados/editados

| Arquivo | Ação |
|---|---|
| `supabase/functions/ai-anomaly/index.ts` | Criar |
| `supabase/functions/ai-goals-check/index.ts` | Criar |
| `supabase/functions/ai-savings-suggestion/index.ts` | Criar |
| `src/components/notifications/NotificationCenter.tsx` | Criar |
| `src/components/layout/MainLayout.tsx` | Header + NotificationCenter |
| `src/hooks/use-transactions.ts` | Fire-and-forget anomaly |
| `src/hooks/use-ai.ts` | refetchInterval + useMarkAllRemindersRead |
| SQL (insert tool) | 2 cron jobs pg_cron |

### NÃO alterados
- `finow-chat/index.ts`, `personal-coach/index.ts`, `ai-reminders/index.ts`
- Nenhuma tabela criada ou alterada
- Nenhuma regra de negócio existente

