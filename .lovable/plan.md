

# Auditoria Mobile — Página de Faturas

## Problemas identificados

### 1. Header — NotificationCenter fora do padrão
Linha 237-243: usa `flex justify-between` com o sino flutuando à direita. Todas as outras páginas já corrigidas (Dashboard, Transações, Contas a Pagar) usam `relative` com `absolute right-0 top-0` para o ícone. Deve seguir o mesmo padrão.

### 2. Card Selector — largura fixa `w-64` corta no mobile
Linha 267: `SelectTrigger className="w-64"` (256px) mais o ícone Receipt à esquerda. Em telas de 320-375px, o select pode ultrapassar a largura da tela ou ficar com pouco padding. Deve usar `w-full` ou `flex-1`.

### 3. PayInvoiceModal — usa `Dialog` em vez de `Drawer` no mobile
Linhas 150-217: o `PayInvoiceModal` dentro de Faturas.tsx usa `Dialog/DialogContent` sempre (desktop e mobile). Não há detecção de `useIsMobile()` nem Drawer mobile. O `PayBillModal` (Contas a Pagar) já está corrigido com Drawer + botão X no mobile. Este modal deveria seguir o mesmo padrão.

### 4. PayInvoiceModal — input `type="date"` nativo sem estilização
Linha 188-192: usa `<input type="date">` nativo em vez do componente `Calendar` + `Popover` que é o padrão do Finow (usado no PayBillModal). Inconsistência visual e de UX.

### 5. InvoiceCard — botão "Pagar Fatura" apertado no mobile
Linha 102-108: valor e botão na mesma linha com `flex justify-between`. Em telas estreitas, o botão `variant="destructive"` e o valor `text-xl` competem por espaço. Deveria ter botão em linha inferior no mobile, igual ao padrão do BillCard.

### 6. InvoiceTransactions — badge de categoria corta texto
Linha 38-44: descrição + badge na mesma linha. Em mobile, a badge `shrink-0` empurra a descrição, que trunca excessivamente. A badge poderia ir para uma segunda linha ou ser removida no mobile.

### 7. Empty state — texto solto sem ícone/container
Linha 286: `<p className="text-muted-foreground text-center py-8">` é apenas um parágrafo. Deveria usar o componente `EmptyState` com ícone Lucide (`Receipt`) e container estilizado, igual às outras páginas.

---

## Plano de correções

### `src/pages/Faturas.tsx`

**Header:** Posicionar NotificationCenter com `absolute right-0 top-0`, título com `pr-12`.

**Card Selector:** Trocar `w-64` por `w-full` no SelectTrigger para ocupar toda a largura disponível.

**Empty state:** Substituir o `<p>` solto pelo componente `EmptyState` com ícone `Receipt`.

**InvoiceCard — botão "Pagar Fatura":** No mobile, mover o botão para uma linha inferior full-width com `border-t`, igual ao BillCard. Manter layout horizontal no desktop.

**InvoiceTransactions:** Empilhar descrição e badge verticalmente (`flex-col`) no mobile em vez de `flex-row`. Ou ocultar badge no mobile.

**PayInvoiceModal:** Refatorar para usar `Drawer` no mobile (com `useIsMobile()`), incluir botão X no DrawerHeader. Substituir `<input type="date">` pelo componente `Calendar` + `Popover` padrão. Reutilizar a mesma estrutura do `PayBillModal`.

