## Plano: Relatórios PDF + Reorganização da Sidebar

### 1. Edge Function `reports` — Geração real de PDF

Reescrever `supabase/functions/reports/index.ts` para gerar PDF real no servidor usando a biblioteca `jspdf` (disponível via ESM no Deno).

**Lógica:**

- Recebe `{ type: "monthly" | "custom", startDate, endDate }` no body
- Busca transações do período agrupadas por categoria (despesas e receitas)
- Busca contas e saldos
- Gera PDF com `jspdf`:
  - Header com logo Finow (texto estilizado), nome do usuário, período
  - Seção "Resumo": receitas totais, despesas totais, balanço
  - Tabela "Despesas por Categoria" (nome, valor, %)
  - Tabela "Receitas por Categoria"
  - Footer com data de geração
  - Cores do design system: verde primario `#1F7A63`, fundo `#F7F8F6`, texto `#1C1F1E`
- Retorna PDF como `application/pdf` (binary)

### 2. Frontend — Modal de Exportação de Relatório

**Novo arquivo: `src/components/reports/ExportReportModal.tsx**`

- Dialog/Drawer responsivo (Dialog desktop, Drawer mobile)
- Filtro de período reutilizando `PeriodFilter` existente
- Botão "Gerar PDF" que chama `supabase.functions.invoke('reports', { body })` e faz download do blob
- Estado de loading com spinner

**Novo hook: `src/hooks/use-reports.ts**`

- Mutation que chama a edge function e retorna o blob PDF
- Tratamento de erro com toast

### 3. Sidebar — Reorganização + Botão de colapso junto à logo

**Arquivo: `src/components/navigation/navigation-items.ts**`

- Adicionar item "Relatórios" com ícone `FileBarChart` entre "Contas a pagar" e "Metas"
- O item de "Relatórios" não navega para uma página, mas abre o modal de exportação

**Arquivo: `src/components/navigation/Sidebar.tsx**`

- Mover o botão de colapsar para dentro do header (ao lado da logo), removendo o botão flutuante externo (`absolute -right-3`)
- Quando colapsado: ícone Finow + botão ChevronRight
- Quando expandido: logo Finow + botão ChevronLeft alinhado à direita
- Separar visualmente os grupos de navegação:
  - Grupo principal: Dashboard, Transações, Contas a pagar
  - Grupo secundário (separador): Metas, Cofrinho, Mentor IA
  - Footer: Relatórios (abre modal), Configurações, Sair

**Arquivo: `src/components/navigation/BottomNav.tsx**`

- Adicionar "Relatórios" no overflow menu mobile  
  
*Garantir que TODAS essas mudanças sejam Mobile First*

### 4. Arquivos afetados


| Arquivo                                         | Ação                                       |
| ----------------------------------------------- | ------------------------------------------ |
| `supabase/functions/reports/index.ts`           | Reescrever com geração PDF real            |
| `src/components/reports/ExportReportModal.tsx`  | Criar                                      |
| `src/hooks/use-reports.ts`                      | Criar                                      |
| `src/components/navigation/navigation-items.ts` | Adicionar Relatórios                       |
| `src/components/navigation/Sidebar.tsx`         | Reorganizar layout + botão colapso na logo |
| `src/components/navigation/BottomNav.tsx`       | Incluir Relatórios no overflow             |
