

# Plano: Filtro de período, FAB Mentor IA, Pesquisa com liquid glass

## 1. Substituir PeriodFilter por navegador de mês (Dashboard + Transações)

Reutilizar o padrão do `BillFilters` (setas esquerda/direita + nome do mês centralizado) como novo componente `MonthNavigator`. Substituir o `PeriodFilter` no Dashboard e Transações por esse componente.

Logo abaixo do navegador de mês, adicionar dois chips rápidos: **Hoje** e **Ontem**, que filtram `startDate = endDate = data selecionada`.

**Arquivos:**
- Criar `src/components/shared/MonthNavigator.tsx` -- componente com setas e mês, emite `onMonthChange(startDate, endDate)` + chips Hoje/Ontem
- Editar `src/pages/Dashboard.tsx` -- trocar `PeriodFilter` por `MonthNavigator`
- Editar `src/pages/Transacoes.tsx` -- trocar `PeriodFilter` (via `TransactionFilters`) por `MonthNavigator`
- Editar `src/components/transactions/TransactionFilters.tsx` -- remover uso do `PeriodFilter`, receber período externo

## 2. Remover rota /chat e transformar Mentor IA em FAB + Sheet overlay

**Remover:**
- Rota `/chat` do `App.tsx`
- Lazy import do Chat
- Item "Mentor IA" do `navigation-items.ts` (do array `secondaryItems`)
- Referência no `routeImportMap`

**Criar FAB do Mentor:**
- Criar `src/components/chat/MentorFAB.tsx` -- botão flutuante menor (h-11 w-11) com ícone `MessageCircle`, posicionado acima do FAB principal
- Ao tocar, abre um `Sheet` (bottom, 90vh) com o conteúdo do chat inline (extraído do `Chat.tsx`)
- Criar `src/components/chat/MentorChatSheet.tsx` -- sheet com o chat completo (mensagens, input, sugestões rápidas, PremiumGate)

**Integrar no MainLayout:**
- Adicionar `MentorFAB` + `MentorChatSheet` no `MainLayout`
- Quando o `MentorChatSheet` estiver aberto, ocultar o FAB de QuickAdd
- O FAB do Mentor aparece em mobile e desktop

**Posicionamento mobile:**
```text
   [💬] ← MentorFAB (h-11 w-11, bottom-[7.5rem] right-4)
   [＋] ← QuickAdd FAB (h-14 w-14, bottom-[4.5rem] right-4)
  ══════ BottomNav ══════
```

## 3. Barra de pesquisa com efeito liquid glass (Transações)

Adicionar um `Input` de pesquisa na tela de Transações, acima dos selects de tipo/categoria/conta. Estilo liquid glass Apple:
- `bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-sm`
- Ícone `Search` interno, placeholder "Buscar transações..."
- Filtra client-side por **descrição** (includes) e **valor** (match parcial)

**Arquivos:**
- Editar `src/pages/Transacoes.tsx` -- adicionar estado `searchQuery`, passar para `TransactionList`
- Editar `src/components/transactions/TransactionFilters.tsx` -- adicionar o input de pesquisa com estilo liquid glass acima dos selects
- Filtrar no `TransactionList` ou na página antes de passar os dados

## Resumo de arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/shared/MonthNavigator.tsx` |
| Criar | `src/components/chat/MentorFAB.tsx` |
| Criar | `src/components/chat/MentorChatSheet.tsx` |
| Editar | `src/pages/Dashboard.tsx` |
| Editar | `src/pages/Transacoes.tsx` |
| Editar | `src/components/transactions/TransactionFilters.tsx` |
| Editar | `src/components/layout/MainLayout.tsx` |
| Editar | `src/components/navigation/navigation-items.ts` |
| Editar | `src/App.tsx` |
| Deletar | `src/pages/Chat.tsx` (conteúdo migrado para MentorChatSheet) |

