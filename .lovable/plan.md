

# Estado Atual do Finow

## Funcional (implementado e conectado ao backend)

| Funcionalidade | Status | Detalhes |
|---|---|---|
| **Autenticação** | OK | Signup, login, rotas protegidas, AuthProvider |
| **Dashboard** | OK | KPIs (saldo, despesas, receitas, balanço, benefício), gráficos por categoria, fluxo mensal, contas próximas, transações recentes, micro insights, filtro de período, customização de widgets |
| **Transações** | OK | CRUD completo, filtros (data, tipo, categoria, conta), Quick Add modal, soft delete, formatação BRL |
| **Contas bancárias** | OK | CRUD em Configurações, tipos (corrente, poupança, benefit_card), saldo, depósito manual de benefício |
| **Contas a pagar (Bills)** | OK | CRUD, filtros, pagamento de conta, resumo no dashboard |
| **Perfil** | OK | Edição de nome/telefone em Configurações |
| **Chat / Mentor IA** | OK | Interface de chat com streaming, histórico, limpar conversa — conectado à edge function `finow-chat` |
| **Configurações IA** | OK | Aba de configurações de IA (consentimentos do coach) |
| **Categorias** | OK | Hook `use-categories`, seletor visual, sugestão por IA via `ai-categorize` |
| **Rate Limiting** | OK | Proteção em 12 edge functions, tabela `rate_limits`, função RPC `check_rate_limit` |
| **Tema dark/light** | OK | ThemeProvider, toggle |
| **Layout responsivo** | OK | Sidebar (desktop), bottom nav (mobile), FAB |
| **Edge Functions** | OK | 14 funções: accounts, transactions, bills, profile, register, chat-messages, finow-chat, personal-coach, ai-categorize, ai-insights, ai-reminders, reports, secrets-gemini, upload-attachment |

## Placeholder (página existe, sem lógica)

| Funcionalidade | Status |
|---|---|
| **Metas** | Tela "Em breve" — sem tabela, sem CRUD |
| **Cofrinho** | Tela "Em breve" — sem tabela, sem CRUD |

## Não implementado / pendente

| Funcionalidade | Notas |
|---|---|
| **Relatórios PDF** | Edge function `reports` existe, mas geração real de PDF não confirmada |
| **Upload de anexos** | Edge function `upload-attachment` existe, mas integração no Quick Add não visível |
| **Coach proativo** | Edge function `personal-coach` existe; check-ins semanais/mensais automáticos não confirmados |
| **AI Insights no dashboard** | Card `InsightsCard` existe; depende de `ai-insights` edge function funcionar com modelo IA |
| **AI Reminders** | Edge function `ai-reminders` existe; integração com notificações in-app não confirmada |
| **Secrets Gemini** | Fluxo de armazenamento de credenciais do Vertex AI — edge function existe |
| **Embeddings / RAG** | Não implementado — vector DB e pipeline de embeddings em tempo real |
| **Persona memory** | Estrutura no banco pode existir; criptografia e UI de edição não confirmadas |
| **Audit logs** | Não confirmado se tabela/trigger existem |
| **Export JSON / exclusão de conta** | Endpoints de LGPD não implementados |
| **PWA offline** | Manifest existe; service worker e cache strategy não implementados |

## Resumo

O core financeiro funciona: autenticação, dashboard, transações, contas, contas a pagar e chat IA. Rate limiting está ativo. **Metas** e **Cofrinho** são as próximas funcionalidades de produto a implementar. No lado de infra, faltam relatórios PDF reais, RAG/embeddings, coach proativo e conformidade LGPD.

