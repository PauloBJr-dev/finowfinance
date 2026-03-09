
# Implementação: Personal Coach — Check-ins Proativos

## Esclarecimento sobre CRON_SECRET

O valor do secret `CRON_SECRET` está criptografado e não pode ser lido via API. Para o SQL do cron job, existem duas opções:

**Opção A**: Você me fornece o valor do CRON_SECRET e eu insiro diretamente no SQL

**Opção B**: Eu implemento todo o código e deixo o SQL do cron job pronto para você inserir manualmente com o valor correto

---

## Escopo da Implementação

### 1. Migração SQL — Novas colunas em ai_settings
```sql
ALTER TABLE ai_settings 
  ADD COLUMN IF NOT EXISTS weekly_checkin_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_checkin_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS checkin_time TEXT NOT NULL DEFAULT '20:00';
```

### 2. Edge Function: personal-coach/index.ts (reescrever)
Substituir stub por implementação completa:
- Valida `x-cron-secret` contra `Deno.env.get('CRON_SECRET')`
- Recebe `{ type: 'weekly' | 'monthly' }`
- Para cada usuário com ai_settings ativo:
  - Verifica `weekly_checkin_enabled` ou `monthly_checkin_enabled`
  - Se weekly no último domingo → pula (mensal substitui)
  - Se monthly mas não é último domingo → pula
  - Se AMBOS consentimentos desativados → pula
  - Verifica duplicata (24h)
  - Verifica token budget (5.000/dia)
  - Busca contexto respeitando consentimentos
  - Chama Gemini Flash (400 tokens max)
  - Insere reminder com `expires_at`
  - Registra em ai_token_usage

### 3. NotificationCenter.tsx — Navegação para check-ins
- Adicionar ícone `CalendarCheck` para `weekly_checkin` / `monthly_checkin`
- Ao clicar: navegar para `/chat?checkin_id={id}`

### 4. Chat.tsx — Carregar check-in
- Detectar query param `checkin_id`
- Buscar reminder via supabase
- **CORREÇÃO 2**: try/catch silencioso — se falhar, chat normal
- Remover query param da URL
- Injetar mensagem como primeiro assistant message

### 5. AISettingsTab.tsx — Nova seção
Adicionar card "Check-ins do Mentor":
- Toggle "Resumo semanal" → `weekly_checkin_enabled`
- Toggle "Resumo mensal" → `monthly_checkin_enabled`
- Select "Horário preferido" → `checkin_time`

### 6. use-ai.ts — Expandir tipos
Adicionar os 3 novos campos ao interface AISettings

### 7. Cron Job SQL
Template pronto para inserção manual:
```sql
SELECT cron.schedule(
  'coach-weekly-checkin',
  '0 23 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://fbsuhhmuwkqzpslonlxt.supabase.co/functions/v1/personal-coach',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "[SEU_CRON_SECRET_AQUI]"}'::jsonb,
    body := '{"type": "weekly"}'::jsonb
  );
  $$
);
```

---

## Pergunta obrigatória

Qual opção você prefere para o CRON_SECRET?

- **A**: Me forneça o valor do secret e eu insiro no SQL automaticamente
- **B**: Eu implemento tudo e você insere o cron job manualmente com o valor correto
