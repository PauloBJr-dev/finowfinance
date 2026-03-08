## Plano: Hook use-cards + CardForm + CardList + Aba Cartões em Configurações

Criação de 3 novos arquivos e edição de 1 existente. Nenhum outro arquivo será tocado.

---

### 1. `src/hooks/use-cards.ts` (novo)

Conteúdo exato fornecido pelo usuário. Hook com `useCards`, `useCreateCard`, `useUpdateCard`, `useDeleteCard`. Usa React Query + Supabase client. Soft delete via `deleted_at`.

---

### 2. `src/components/cards/CardForm.tsx` (novo)

Seguir o padrão existente de `AccountForm.tsx`:

- Componente renderizado dentro de um `Sheet` (side panel)
- Props: `open`, `onOpenChange`, `onSubmit`, `initialData?` (Card), `isLoading`
- Campos com `react-hook-form` + `zod`:
  - **Nome do cartão** (text, obrigatório, min 2, max 100)
  - **Limite de crédito** (CurrencyInput, obrigatório)
  - **Dia de fechamento** (number input, 1-31, obrigatório) com tooltip
  - **Dia de vencimento** (number input, 1-31, obrigatório) com tooltip
- Modo edição: preenche valores do card existente
- Botões: "Cancelar" (outline) + "Salvar/Criar" (primary)

---

### 3. `src/components/cards/CardList.tsx` (novo)

Seguir o padrão de `AccountList.tsx`:

- Usa `useCards()` para listar
- Cada card mostra: ícone CreditCard, nome, limite formatado, "Fecha dia X | Vence dia Y"
- Menu dropdown (MoreVertical) com Editar e Excluir
- Editar: abre CardForm em Sheet
- Excluir: usa `DeleteConfirmation` existente (checkbox "Eu entendo" + botão vermelho)
- Undo toast via `showDeleteToast` (não há restore implementado no hook fornecido, mas soft delete permite)
- Empty state: "Nenhum cartão cadastrado" com botão "Adicionar cartão"
- Botão "+ Adicionar cartão" no topo quando há cartões

---

### 4. `src/pages/Configuracoes.tsx` (editar)

- Importar `CardList` e ícone `CreditCard`
- Alterar grid de 3 para 4 colunas: `grid-cols-4`
- Inserir aba "Cartões" entre "Contas" e "Perfil"
- Adicionar `TabsContent value="cards"` com `<CardList />`

---

### Arquivos NÃO modificados

Todos os demais arquivos permanecem intocados. Nenhuma Edge Function criada. Nenhuma migração necessária (tabela `cards` já existe).