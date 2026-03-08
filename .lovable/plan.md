

# Fase 3 — Relatórios Ultra-Personalizados

## Arquivos a criar

### 1. `supabase/functions/reports-preview/index.ts`
Edge function com `verify_jwt = true`. Recebe `{ startDate, endDate }`, autentica via JWT, e:

- Agrega dados: transações do período, últimos 6 meses, metas, cofrinho, anomalias
- Calcula score de saúde (0-100) com os 6 critérios definidos
- Verifica consentimentos (`allow_coach_use_transactions`, `allow_coach_use_goals`)
- Verifica token budget (5.000/dia) antes de chamar IA
- Faz **uma única chamada** ao Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling para gerar as 4 seções em uma resposta
- System prompt inclui as 4 regras anti-alucinação obrigatórias
- Registra tokens em `ai_token_usage` com `agent_name: 'reporting'`
- Retorna JSON com: summary, expensesByCategory, incomeByCategory, historicalMonths, projection, score, ai (narrative, historicalObservation, projectionInterpretation, scoreAnalysis, unavailable, unavailableReason)

### 2. `src/pages/Relatorios.tsx`
Nova página dedicada de relatórios com:
- PeriodFilter para selecionar período
- Botão "Analisar" que chama `reports-preview`
- Loading: "O Mentor está analisando seus dados..."
- Preview das 4 seções: ScoreGauge em destaque, narrativa, tabela comparativa com setas, projeção
- Dois botões: "Gerar PDF completo" e "Gerar sem análise IA"
- Tratamento de 429 com mensagem amigável
- Premium gate
- NotificationCenter no header (consistente com outras páginas)

### 3. `src/components/reports/ScoreGauge.tsx`
Componente visual gauge circular (0-100) com cor por faixa (verde/amarelo/laranja/vermelho) e label do nível.

### 4. `src/components/reports/ReportPreview.tsx`
Componente que renderiza as 4 seções do preview (narrativa, comparativo, projeção, score com análise IA).

## Arquivos a modificar

### 5. `supabase/functions/reports/index.ts`
Expandir para aceitar `{ startDate, endDate, includeAI, aiData }`:
- Se `includeAI = true` e `aiData` fornecido: renderizar 4 novas seções no PDF
- **CORREÇÃO 2**: Envolver uso de `aiData` em try/catch. Se `aiData` vier null/undefined/inválido, continuar gerando PDF normalmente com avisos discretos no lugar das seções IA. Nunca travar por `aiData` inválido.
- Seção A: Narrativa (texto corrido com fundo light)
- Seção B: Tabela comparativa 6 meses + observação IA
- Seção C: Projeção (3 cards + interpretação + disclaimer)
- Seção D: Score gauge simplificado + pontos fortes/melhorias

### 6. `src/hooks/use-reports.ts`
- Adicionar `useReportPreview(startDate, endDate)` — mutation que chama `reports-preview`
- Expandir `generatePDF` para aceitar `{ includeAI, aiData }`
- Tratar erro 429 com mensagem específica de IA

### 7. `src/App.tsx`
- Adicionar lazy import do `Relatorios` e rota `/relatorios` protegida

### 8. `src/components/navigation/navigation-items.ts`
- Converter `reportsItem` de modal-only para rota navegável (`to: "/relatorios"`, `premium: true`)

### 9. `src/components/navigation/Sidebar.tsx`
- Mudar o botão de relatórios de onClick modal para NavItem com rota `/relatorios`
- Remover import e uso do `ExportReportModal`

### 10. `src/components/navigation/BottomNav.tsx`
- Atualizar para usar rota `/relatorios` no overflow menu em vez de abrir modal

### 11. `supabase/config.toml`
- Adicionar `[functions.reports-preview]` com `verify_jwt = true`

## Correções aplicadas

- **CORREÇÃO 1**: Todas as chamadas IA usam `google/gemini-3-flash-preview` via Lovable AI Gateway, consistente com Fases 1 e 2
- **CORREÇÃO 2**: No `reports/index.ts`, `aiData` é envolto em try/catch; se inválido, PDF continua normalmente com avisos discretos

## NÃO alterados
- Fases 1 e 2 (chat, notificações, persona_memory)
- personal-coach/index.ts
- Nenhuma tabela ou migração
- Nenhuma regra de negócio existente

