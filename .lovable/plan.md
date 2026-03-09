

# Auditoria Mobile — Página de Contas a Pagar

## Problemas identificados

### 1. Header — NotificationCenter fora do padrão
O header usa `flex justify-between` com o sino flutuando sozinho à direita, igual ao problema que já corrigimos em Dashboard e Transações. Deve seguir o padrão: ícone posicionado com `absolute right-0 top-0`, título com `pr-12`.

### 2. Summary Cards — grid empilhado desnecessariamente
No mobile, `grid-cols-1` empilha 3 cards de resumo verticalmente, ocupando muito espaço vertical antes da lista. Melhor usar `grid-cols-3` compacto no mobile também, com layout horizontal condensado (ícone menor, textos menores).

### 3. BillCard — botões "Pagar" e lixeira apertados no mobile
O layout `flex items-start justify-between` coloca descrição à esquerda e valor + botões à direita. Em telas estreitas, o valor e os botões competem por espaço com o texto, causando truncamento excessivo. O botão "Pagar" e o ícone de lixeira ficam empilhados de forma desconfortável.

**Correção:** No mobile, mover botões de ação para uma linha inferior full-width dentro do card, separados por `border-t`.

### 4. BillCard — emoji na recorrência
A seção de recorrência usa emoji "🔄" em vez de ícone Lucide, fora do padrão do design system.

### 5. PayBillModal (Drawer) — sem botão X para fechar
O Drawer mobile do PayBillModal não tem botão X no header, igual ao problema que corrigimos no TransactionForm. Usuário depende do gesto de arrastar para fechar.

### 6. BillFilters — TabsList com 4 abas apertadas no mobile
As 4 abas (A Vencer, Vencidas, Pagas, Todas) com contadores ficam comprimidas em telas < 375px. Os textos ficam cortados ou minúsculos.

**Correção:** Usar scroll horizontal com `overflow-x-auto scrollbar-hide` no `TabsList`.

---

## Plano de correções

### `src/pages/ContasPagar.tsx`
- Header: posicionar NotificationCenter com `absolute right-0 top-0`, título com `pr-12`
- Summary Cards: mudar para `grid-cols-3` sempre, com ícone `h-8 w-8`, textos `text-xs` e valores `text-sm font-semibold` no mobile

### `src/components/bills/BillCard.tsx`
- Mobile: reorganizar layout — info (ícone + descrição + valor) na parte superior, botões em linha inferior separada com `border-t mt-3 pt-3`
- Trocar emoji "🔄" por ícone Lucide `RefreshCw`
- Garantir `min-h-[48px]` nos botões de ação para touch targets

### `src/components/bills/BillFilters.tsx`
- TabsList: adicionar `overflow-x-auto scrollbar-hide flex-nowrap` para scroll horizontal no mobile

### `src/components/bills/PayBillModal.tsx`
- Adicionar botão X no DrawerHeader, seguindo o mesmo padrão do QuickAddModal/TransactionForm

