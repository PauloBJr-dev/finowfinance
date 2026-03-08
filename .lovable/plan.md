

## Plano: Badge Premium no Dashboard + Bloqueio de features no plano gratuito

### 1. Badge Premium no Dashboard
- No header do `Dashboard.tsx`, ao lado da saudacao, exibir um badge condicional usando `useAuth()`:
  - Se `plan === "premium"` ou `plan === "lifetime"`: badge verde "Premium" ou "Lifetime"
  - Se `plan === "free"`: badge cinza "Free" (opcional, pode omitir)
- Usar o componente `Badge` existente com variantes de cor customizadas

### 2. Componente PremiumGate (novo)
- Criar `src/components/shared/PremiumGate.tsx`: wrapper que verifica `useAuth().plan`
  - Se free: renderiza um overlay/card informando que a feature e Premium, com CTA para upgrade
  - Se premium/lifetime: renderiza `children` normalmente

### 3. Bloquear features para usuarios free
- **Metas** (`src/pages/Metas.tsx`): envolver conteudo com `PremiumGate`
- **Cofrinho** (`src/pages/Cofrinho.tsx`): envolver conteudo com `PremiumGate`
- **Relatorios PDF** (`src/components/reports/ExportReportModal.tsx`): dentro do modal, antes de gerar, verificar plan. Se free, mostrar mensagem de upgrade ao inves do botao de export
- **Mentor IA / Chat** (`src/pages/Chat.tsx`): envolver com `PremiumGate`

### 4. Indicadores visuais na navegacao
- No `NavItem.tsx`, aceitar prop opcional `premium?: boolean` e renderizar um mini icone de cadeado ou badge ao lado do label para itens premium
- Em `navigation-items.ts`, marcar `metas`, `cofrinho` e `chat` como `premium: true`
- No `Sidebar.tsx`, marcar o botao de Relatorios como premium tambem

### Arquivos modificados
- `src/pages/Dashboard.tsx` — badge de plano no header
- `src/components/shared/PremiumGate.tsx` — novo componente gate
- `src/pages/Metas.tsx`, `src/pages/Cofrinho.tsx`, `src/pages/Chat.tsx` — wrap com PremiumGate
- `src/components/reports/ExportReportModal.tsx` — check de plano antes de gerar
- `src/components/navigation/NavItem.tsx` — prop premium + icone cadeado
- `src/components/navigation/navigation-items.ts` — marcar itens premium
- `src/components/navigation/Sidebar.tsx` — marcar Relatorios como premium

