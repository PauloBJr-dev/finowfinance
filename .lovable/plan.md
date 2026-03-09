

# Auditoria Mobile — Pagina de Transacoes

## Problemas identificados

### 1. Header — NotificationCenter mal posicionado
O header usa `flex justify-between` com o titulo a esquerda e o icone de notificacao isolado a direita. No mobile, isso cria um layout desbalanceado — o sino fica "flutuando" sozinho. Deveria seguir o mesmo padrao do Dashboard mobile (icones agrupados no canto superior direito com posicionamento absoluto).

### 2. Filtros de tipo/categoria/conta — larguras fixas cortam no mobile
Os `SelectTrigger` tem larguras fixas (`w-[130px]`, `w-[150px]`). No mobile (320-375px), tres selects + botao limpar em `flex-wrap` ocupam mais que a tela, causando:
- Selects cortados ou apertados
- Texto truncado dentro dos triggers
- Layout desorganizado

**Correcao:** Usar `w-full` no mobile com grid responsivo (`grid grid-cols-3 gap-2` ou empilhar verticalmente).

### 3. TransactionForm (editar) — Drawer sem botao de fechar
O Drawer de edicao tem `dismissible={false}` e nao tem botao X visivel. O usuario fica "preso" — so consegue sair clicando "Salvar" ou o botao de lixeira. O QuickAddModal ja tem um botao X no header do Drawer, mas o TransactionForm nao.

**Correcao:** Adicionar botao X no DrawerHeader, igual ao QuickAddModal.

### 4. TransactionForm — grid 2 colunas muito apertado no mobile
`grid grid-cols-2 gap-3` para Valor+Data e Categoria+Conta fica muito apertado em telas < 375px. O CurrencyInput e o date picker ficam espremidos. O QuickAddModal usa campos em coluna unica (full width), que e mais confortavel.

**Correcao:** No mobile, usar `grid-cols-1` para esses campos. Manter 2 colunas no desktop.

### 5. TransactionItem — area de toque pequena
O `p-3` no botao de cada transacao resulta em area de toque de ~44px, mas em alguns casos (texto curto) pode ficar menor. Recomendado garantir `min-h-[48px]` para conformidade com guidelines de toque mobile.

### 6. Empty state — nao segue padrao Finow
O emoji "memo" como icone de estado vazio e informal. Outras paginas usam icones Lucide com estilo consistente. Deveria usar um icone Lucide (ex: `Receipt` ou `ListX`) com fundo circular em `muted`, seguindo o padrao do design system.

---

## Plano de correcoes

### Arquivo: `src/pages/Transacoes.tsx`
- Reestruturar header mobile: icone de notificacao no canto superior direito com `absolute`, titulo e subtitulo ocupam linha inteira com `pr-12` para nao colidir.

### Arquivo: `src/components/transactions/TransactionFilters.tsx`
- Selects: trocar larguras fixas por layout responsivo. No mobile, `grid grid-cols-3 gap-2` com `w-full` em cada select. No desktop, manter `flex` horizontal com larguras fixas.

### Arquivo: `src/components/transactions/TransactionForm.tsx`
- Adicionar botao X no DrawerHeader (mesmo padrao do QuickAddModal).
- Grid de campos: `grid-cols-1 md:grid-cols-2` em vez de `grid-cols-2` fixo.

### Arquivo: `src/components/transactions/TransactionList.tsx`
- Empty state: trocar emoji por icone Lucide (`Receipt`) com container circular `bg-muted`.
- TransactionItem: adicionar `min-h-[48px]` no botao para area de toque minima.

### Arquivo: `src/components/transactions/TransactionItem.tsx`
- Adicionar `min-h-[48px]` ao botao raiz.

