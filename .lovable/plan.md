## Plano: Fase 1 — Mentor IA Contextualizado

### 1. Migração SQL

A tabela `ai_settings` já possui as colunas `allow_coach_use_transactions`, `allow_coach_use_goals`, `store_conversations` e `persona_memory`. Ajustes necessários:

- **ALTER** `persona_memory` de `JSONB NOT NULL DEFAULT '{}'` para `TEXT DEFAULT NULL` (valor encriptado)
- **DROP** coluna `allow_coach_use_invoices` (removida do app)

### 2. Secret: PERSONA_MEMORY_KEY

Solicitar ao usuário uma chave AES-256 (32 bytes hex ou base64) via `add_secret` para encriptação de persona_memory.

### 3. Edge Function `finow-chat/index.ts` — Context Builder com consentimentos

Refatorar o bloco de contexto financeiro:

- **Buscar ai_settings** do usuário (allow_coach_use_transactions, allow_coach_use_goals, store_conversations, persona_memory)
- **Buscar dados em paralelo** respeitando consentimentos:
  - `allow_coach_use_transactions` → transações + contas + bills (já existente)
  - `allow_coach_use_goals` → goals (novo)
- **Persona memory**: descriptografar com AES-256-CBC usando `PERSONA_MEMORY_KEY`. Se falhar → defaults (`tone: casual, summary_length: short`). Nunca logar valor.
- **Injetar persona** no system prompt (tom casual/formal, resumo curto/longo)
- **Após stream terminar**: enviar evento SSE `data: {"meta": {"data_points": [...]}}` antes de `[DONE]`, listando quais dados foram usados (ex: "transações do mês", "metas ativas", "contas bancárias")
- **Gravar persona_memory** se o modelo sugerir atualização de preferência (via parsing de resposta com tag especial) — encriptar antes de UPDATE

### 4. Hook `use-chat.ts` — data_points e loading state

- Expandir `ChatMessage` type: adicionar `dataPoints?: string[]` opcional
- No parser SSE: detectar evento `meta` com `data_points` e anexar ao último assistant message
- Adicionar estado `isLoadingContext` (true entre envio e primeiro chunk) para exibir "Analisando seus dados..."

### 5. `Chat.tsx` — UI enhancements

- **Loading "Analisando seus dados..."**: exibir quando `isLoadingContext` e nenhum chunk recebido ainda
- **Chips de data_points**: abaixo de cada resposta do assistant, renderizar badges com os data_points (ex: "Transações do mês", "Metas ativas")
- **Sugestões rápidas**: 3 chips no empty state (ex: "Como estão meus gastos?", "Tenho metas ativas?", "Quais contas vencem?") — armazenados em `useState` no componente, gerados uma vez por sessão (sem chamada à IA)
- **Banner de consentimentos**: banner discreto no topo do chat quando `allow_coach_use_transactions === false && allow_coach_use_goals === false`, informando que o mentor tem acesso limitado

### 6. `use-ai.ts` — AISettings type update

Atualizar interface:

```typescript
interface AISettings {
  id: string; user_id: string;
  categorization_enabled: boolean; reminders_enabled: boolean;
  daily_token_limit: number;
  allow_coach_use_transactions: boolean;
  allow_coach_use_goals: boolean;
  store_conversations: boolean;
  persona_memory: string | null;
}
```

### 7. `AISettingsTab.tsx` — Novos toggles + persona

Adicionar ao card "Agentes de IA":

- Toggle: "Compartilhar transações com o Mentor" (`allow_coach_use_transactions`)
- Toggle: "Compartilhar metas com o Mentor" (`allow_coach_use_goals`)
- Toggle: "Armazenar conversas" (`store_conversations`)

Nova seção "Personalização do Mentor":

- Select "Tom": casual / formal
- Select "Tamanho do resumo": curto / longo
- Esses valores são gravados como persona_memory encriptado (via edge function ou diretamente — TBD: usar uma edge function dedicada para encriptar antes de gravar)  
  
No item 7 (AISettingsTab), a gravação do persona_memory 
  deve acontecer via edge function finow-chat/index.ts 
  (endpoint separado, ex: action: 'update_persona').
  O frontend envia o JSON em texto puro, o edge function 
  criptografa com AES-256-CBC usando PERSONA_MEMORY_KEY 
  e grava como TEXT na coluna persona_memory.
  O frontend NUNCA criptografa diretamente — não tem acesso à chave.

### 8. Arquivos editados


| Arquivo                                     | Ação                                                            |
| ------------------------------------------- | --------------------------------------------------------------- |
| Migração SQL                                | ALTER persona_memory, DROP allow_coach_use_invoices             |
| `supabase/functions/finow-chat/index.ts`    | Context builder + consentimentos + persona decrypt + meta event |
| `src/hooks/use-chat.ts`                     | dataPoints, isLoadingContext                                    |
| `src/hooks/use-ai.ts`                       | AISettings interface                                            |
| `src/pages/Chat.tsx`                        | Sugestões, loading, data_points chips, banner                   |
| `src/components/settings/AISettingsTab.tsx` | Novos toggles + persona section                                 |


### Arquivos NÃO alterados

- `personal-coach/index.ts` — permanece stub
- Nenhuma outra edge function
- Nenhuma regra de negócio existente