

## Plano: Mentor IA Contextualizado (Fase 1)

### Situacao Atual

- `finow-chat/index.ts` ja busca contexto basico (transactions, accounts, bills) mas falta: faturas de cartao, metas, cofrinho, consentimentos granulares, persona_memory
- `personal-coach/index.ts` e um stub (501)
- Tabela `ai_settings` tem apenas `categorization_enabled` e `reminders_enabled` — faltam colunas de consentimento e persona_memory
- Chat.tsx nao exibe data_points, sugestoes rapidas nem banner de consentimento

### Mudancas Necessarias

**1. Migracao de banco — adicionar colunas a `ai_settings`**

Novas colunas:
- `allow_coach_use_transactions` boolean default true
- `allow_coach_use_invoices` boolean default true
- `allow_coach_use_goals` boolean default true
- `store_conversations` boolean default false
- `persona_memory` jsonb default '{}' (contem tone, summary_length, checkin_time etc — encriptado pela aplicacao antes de gravar)

Isso evita criar tabela extra e mantem tudo centralizado.

**2. Backend — reescrever contexto em `finow-chat/index.ts`**

Buscar em paralelo (respeitando consentimentos):
- Contas + saldos (sempre)
- Transacoes do mes + ultimas 20 (se `allow_coach_use_transactions`)
- Despesas por categoria (se `allow_coach_use_transactions`)
- Faturas abertas de cada cartao (se `allow_coach_use_invoices`)
- Metas ativas (se `allow_coach_use_goals`)
- Cofrinhos (se `allow_coach_use_goals`)
- Bills proximos 30 dias (se `allow_coach_use_transactions`)
- Persona memory para adaptar tom

Montar JSON estruturado e injetar no system prompt. Registrar quais blocos de dados foram incluidos para retornar como `data_points` no final do stream (via evento SSE customizado `data: {"data_points": [...]}`).

Refinar system prompt: referenciar dados explicitamente, usar persona_memory para tom, instruir modelo a nunca ser generico quando ha dados.

**3. Backend — enviar data_points apos stream**

Apos o stream do Gemini terminar, enviar um evento SSE extra:
```
data: {"meta": {"data_points": ["20 transacoes de marco", "Fatura Nubank R$1.240", ...]}}
```
Isso permite ao frontend exibir os chips sem precisar parsear a resposta.

**4. Frontend — `use-chat.ts`**

- Parsear o evento `meta` do SSE para extrair `data_points` por mensagem
- Armazenar `data_points` junto com cada mensagem assistant no state

**5. Frontend — `Chat.tsx`**

- Exibir chips de data_points abaixo de cada resposta do assistant
- Sugestoes rapidas dinamicas no empty state (3 perguntas baseadas em dados do usuario via query leve)
- Loading state: "Analisando seus dados..." em vez dos 3 pontos
- Banner discreto quando consentimentos estao desativados: "Ative o acesso aos dados em Configuracoes para respostas personalizadas"

**6. Frontend — `AISettingsTab.tsx`**

- Adicionar toggles para os 3 consentimentos granulares + store_conversations
- Secao de persona_memory (tom, resumo curto/longo)

### Arquivos a criar/editar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar (add columns to ai_settings) |
| `supabase/functions/finow-chat/index.ts` | Reescrever context builder + system prompt + data_points SSE |
| `src/hooks/use-chat.ts` | Parsear meta event, armazenar data_points |
| `src/pages/Chat.tsx` | Chips, sugestoes, loading, banner |
| `src/components/settings/AISettingsTab.tsx` | Toggles de consentimento + persona |
| `src/hooks/use-ai.ts` | Atualizar tipo AISettings com novas colunas |

### Sem alteracoes em

- Regras de negocio existentes
- Nenhum outro edge function
- Nenhuma tabela alem de ai_settings

