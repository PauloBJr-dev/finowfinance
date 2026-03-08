

## Varredura Completa: Problemas de UI/UX no Finow

Após analisar todos os componentes, páginas e layouts do sistema, identifiquei os seguintes problemas organizados por severidade.

---

### 1. Bug Crítico: `App.css` conflitando com o layout

O arquivo `src/App.css` contém estilos legados do template Vite que **quebram o layout**:
- `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }` — limita largura, adiciona padding indesejado e centraliza texto em todo o app
- `.card { padding: 2em; }` — sobrescreve o padding dos cards shadcn/ui globalmente

**Correção:** Remover ou esvaziar `App.css` completamente.

---

### 2. Página 404 em inglês

`NotFound.tsx` exibe "Oops! Page not found" e "Return to Home" — fora do padrão PT-BR do app. Falta o layout do Finow (logo, design system).

**Correção:** Traduzir para PT-BR, aplicar design system Finow com logo e botao estilizado.

---

### 3. Inconsistências de layout no Dashboard

- **Botão "Ver transações"** flutuando sozinho entre cards e gráficos (linha 158-164). Deveria estar integrado no header ou removido (a navegação lateral já leva para Transações).
- **Grid de KPIs**: usa `md:grid-cols-3` + condicional `lg:grid-cols-4` — no mobile com benefit card, todos empilham sem visual hierarchy. Em tablet (md), 3 colunas forçam o 4o card para linha separada sozinho.
- **PeriodFilter** no Dashboard e em Transações não compartilha estado visual consistente — ambos começam em "Mês atual" mas são instâncias separadas.

**Correção:** Remover botão "Ver transações" solto. Ajustar grid para `grid-cols-2 md:grid-cols-4` (ou `md:grid-cols-2 lg:grid-cols-4`).

---

### 4. Mobile: BottomNav sem label legível

A BottomNav usa `text-2xs` (0.625rem = 10px) para labels — abaixo do mínimo recomendado de 11-12px para legibilidade mobile. Rótulos como "Transações" e "Contas a pagar" são longos demais para esse tamanho.

**Correção:** Usar `text-xs` (12px) e abreviar labels no mobile ("Contas" em vez de "Contas a pagar").

---

### 5. Dropdown do menu "Mais" (BottomNav) abre para cima sem ajuste

O `DropdownMenuContent` tem `className="mb-2 w-48"` mas sem `side="top"` explícito. O dropdown pode abrir para baixo e ficar cortado pelo viewport.

**Correção:** Adicionar `side="top"` e `sideOffset={8}`.

---

### 6. AccountList: botão de ações invisível até hover

O botão `MoreVertical` tem `opacity-0 group-hover:opacity-100` — **impossível acessar no mobile** (não existe hover em touch). Usuários mobile nunca veem as opções Editar/Excluir/Depositar.

**Correção:** Remover a lógica de opacidade condicional ou tornar sempre visível no mobile (`max-md:opacity-100`).

---

### 7. Páginas vazias sem conteúdo (Metas e Cofrinho)

Ambas são stubs de uma linha. Sem empty state, sem CTA, sem explicação. Usuários chegam e veem apenas título + subtítulo — impressão de app quebrado.

**Correção:** Adicionar `EmptyState` com ícone, mensagem "Em breve" ou CTA futuro para manter consistência.

---

### 8. TransactionForm (edição): type toggle inconsistente com QuickAdd

- **QuickAdd**: toggle usa `bg-destructive text-destructive-foreground` (opaco, sólido)
- **TransactionForm**: usa `bg-destructive/10 text-destructive` (transparente, sutil)

São o mesmo conceito visual (escolher tipo) mas com aparências diferentes.

**Correção:** Unificar o estilo do toggle em ambos os formulários.

---

### 9. Calendário com 2 meses no PeriodFilter mobile

`numberOfMonths={2}` no modo "Personalizado" — em telas pequenas, dois meses lado a lado transbordam o viewport ou ficam muito comprimidos.

**Correção:** Usar `numberOfMonths={1}` no mobile via `useIsMobile()`.

---

### 10. DeleteConfirmation sempre usa Drawer (desktop também)

O `DeleteConfirmation` usa `Drawer` (bottom sheet) tanto no desktop quanto no mobile. No desktop, um Dialog centralizado é o padrão esperado.

**Correção:** Usar pattern responsivo — `Dialog` no desktop, `Drawer` no mobile (como o QuickAdd já faz).

---

### 11. Container padding inconsistente

`MainLayout` usa `className="container py-6"` — o container do Tailwind tem `padding: 1.5rem` (config). No mobile isso resulta em 24px de cada lado, aceitável, mas o conteúdo **não tem `px` adicional** nos headers das páginas, causando alinhamento correto. Porém, em telas muito pequenas (<360px), cards podem ficar espremidos.

**Correção:** Garantir `px-4 sm:px-6` no container para melhor responsividade em telas menores.

---

### 12. Sidebar toggle button cortado em z-index

O botão de toggle da sidebar (`absolute -right-3 top-20`) flutua fora do sidebar, pode ser cortado por `overflow: hidden` em contextos específicos ou conflitar com o conteúdo principal.

**Correção:** Nenhuma urgente, mas considerar mover para dentro do sidebar.

---

### 13. Auth page sem tratamento de loading inicial

A tela de autenticação não tem feedback visual ao carregar (apenas "Carregando..." no botão). O `ProtectedRoute` mostra spinner mas a transição entre spinner e page é abrupta.

**Correção:** Adicionar animação fade-in na transição.

---

### 14. BillFilters: tabs text truncado em mobile

`TabsList` com `grid-cols-4` + labels como "A Vencer", "Vencidas", "Pagas", "Todas" + contadores — em telas < 375px ficam cortados.

**Correção:** Usar scroll horizontal ou reduzir para ícones + tooltips no mobile.

---

### Resumo de Prioridades

| Prioridade | Item | Impacto |
|:---:|:---|:---|
| P0 | App.css quebrando layout | Layout global |
| P0 | AccountList ações invisíveis no mobile | Funcionalidade bloqueada |
| P1 | Página 404 em inglês | Brand consistency |
| P1 | Metas/Cofrinho sem empty state | Percepção de app incompleto |
| P1 | DeleteConfirmation: Drawer no desktop | UX padrão quebrado |
| P1 | Dashboard grid KPIs | Layout mobile/tablet |
| P2 | BottomNav labels pequenos | Acessibilidade |
| P2 | Toggle type inconsistente | Consistência visual |
| P2 | Calendar 2 meses no mobile | Usabilidade |
| P2 | BillFilters tabs truncadas | Legibilidade mobile |
| P3 | Botão "Ver transações" solto | Ruído visual |
| P3 | Dropdown BottomNav sem side="top" | Edge case |
| P3 | Auth fade-in transition | Polish |

### Plano de Implementacao

Corrigir todos os 14 itens acima em ordem de prioridade. Arquivos afetados:

1. Remover/esvaziar `src/App.css`
2. `src/components/accounts/AccountList.tsx` — ações sempre visíveis no mobile
3. `src/pages/NotFound.tsx` — traduzir e redesenhar
4. `src/pages/Metas.tsx` e `src/pages/Cofrinho.tsx` — adicionar EmptyState
5. `src/components/shared/DeleteConfirmation.tsx` — Dialog no desktop, Drawer no mobile
6. `src/pages/Dashboard.tsx` — ajustar grid, remover botão "Ver transações"
7. `src/components/navigation/BottomNav.tsx` — labels maiores, DropdownMenu side="top"
8. `src/components/transactions/TransactionForm.tsx` — unificar toggle style
9. `src/components/shared/PeriodFilter.tsx` — 1 mês no mobile
10. `src/components/bills/BillFilters.tsx` — melhorar responsividade das tabs

