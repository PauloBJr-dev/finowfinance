

## Plano: Agente de Insights + Chat com Mentor Financeiro

### Parte 1: Agente de Insights

**Edge Function `supabase/functions/ai-insights/index.ts`** (novo)
- Recebe POST com `{ startDate, endDate }`
- Busca transações do período do usuário autenticado (com categorias)
- Monta prompt para Gemini 3 Flash Preview com contexto financeiro: totais por categoria, receitas vs despesas, padrões de gasto
- Usa tool calling para retornar estrutura: `{ summary, highlights[], warnings[], tips[] }`
- Registra tokens em `ai_token_usage` (agent: `insights`, cap: 20k/dia)
- Trata erros 429/402

**`src/hooks/use-ai.ts`** — Adicionar `useInsights(startDate, endDate)` mutation que invoca a edge function

**`src/components/dashboard/InsightsCard.tsx`** (novo)
- Card no dashboard com botão "Gerar Insights" (não automático, para economizar tokens)
- Exibe resultado: resumo, destaques, alertas e dicas
- Renderiza markdown via formatação simples (bold, listas)
- Estado: idle → loading → resultado
- Toggle controlável via `DashboardCustomizer` (widget id: `ai_insights`)

**`src/hooks/use-dashboard-preferences.ts`** — Adicionar `ai_insights` aos defaults

**`src/pages/Dashboard.tsx`** — Renderizar `InsightsCard` condicionalmente

**`supabase/config.toml`** — Adicionar `[functions.ai-insights]`

---

### Parte 2: Chat com Mentor Financeiro (streaming)

**Edge Function `supabase/functions/finow-chat/index.ts`** (novo, substituindo o stub `chat-messages`)
- POST com `{ messages: [{role, content}] }`
- Valida auth, verifica token budget (agent: `chat`, cap: 40k/dia)
- Busca contexto financeiro do usuário (último mês de transações resumido, saldo de contas, bills pendentes) para injetar no system prompt
- System prompt: mentor financeiro calmo, casual, PT-BR. Não executa transações. Não dá conselho regulado. Cita dados usados
- Chama Lovable AI Gateway com `stream: true` (model: `google/gemini-3-flash-preview`)
- Retorna SSE stream direto ao cliente
- Trata 429/402

**`src/hooks/use-chat.ts`** (novo)
- Gerencia estado de mensagens `{role, content}[]`
- Função `sendMessage` que faz fetch SSE e parseia token-por-token
- Atualiza última mensagem assistant progressivamente
- Não persiste conversas por padrão (conforme spec: `store_conversations` default = não)

**`src/pages/Chat.tsx`** (novo)
- Layout fullscreen com header, área de mensagens scrollável, input fixo no bottom
- Mensagens renderizadas com markdown (react-markdown não está instalado, usaremos formatação simples com `whitespace-pre-wrap` e detecção de bold/listas)
- Indicador de typing durante streaming
- Mensagem inicial de boas-vindas do mentor
- Botão de limpar conversa

**Navegação** — Adicionar rota `/chat` e item na sidebar/bottom nav (ícone `MessageCircle`)

**`src/App.tsx`** — Adicionar rota protegida `/chat`

**`supabase/config.toml`** — Adicionar `[functions.finow-chat]`

---

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/ai-insights/index.ts` |
| Criar | `supabase/functions/finow-chat/index.ts` |
| Criar | `src/components/dashboard/InsightsCard.tsx` |
| Criar | `src/hooks/use-chat.ts` |
| Criar | `src/pages/Chat.tsx` |
| Editar | `src/hooks/use-ai.ts` (add useInsights) |
| Editar | `src/hooks/use-dashboard-preferences.ts` (add ai_insights) |
| Editar | `src/components/dashboard/DashboardCustomizer.tsx` (add ai_insights) |
| Editar | `src/pages/Dashboard.tsx` (render InsightsCard) |
| Editar | `src/App.tsx` (add /chat route) |
| Editar | `src/components/navigation/navigation-items.ts` (add Chat) |

### Segurança
- Ambas edge functions validam JWT manualmente
- Sanitização de inputs no chat (max 500 chars por mensagem)
- Token budget enforced por usuário e por agente
- Chat NÃO executa transações (apenas sugere)
- CORS restrito aos domínios autorizados

