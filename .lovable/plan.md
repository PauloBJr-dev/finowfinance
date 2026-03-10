

# Redesenho da Tela de Faturas: Componentes de Transação + Navegador Mensal

## Visão Geral

Duas mudanças na página de Faturas:
1. Novos componentes visuais estilo Nubank/Inter para transações e parcelas dentro da fatura
2. Navegador mensal (uma fatura por vez) em vez de listar todas

## Arquivos Criados

### `src/components/invoices/InvoiceTransactionItem.tsx`
- Layout horizontal `min-h-[56px] px-4 py-3`
- Ícone de categoria em círculo 36px com cor de fundo (15% opacity) usando `resolveCategoryIcon` de `category-icons.ts`
- Bloco central: description (text-sm font-medium) + category.name · dd/MM (text-xs muted)
- Valor à direita: `text-sm font-semibold text-destructive`
- Separador via `border-b border-border/40` (exceto último item)
- `cursor-pointer active:opacity-70`, sem hover background

### `src/components/invoices/InvoiceInstallmentGroup.tsx`
- Colapsável, padrão fechado
- Header: ícone categoria + descrição + Badge `N/total` + valor da parcela + Chevron rotacionável
- Expandido: sub-lista indentada `pl-4` com data e valor em `text-xs`
- Animação: `transition-all duration-200` com `overflow-hidden max-h-0 → max-h-[500px]`

## Arquivos Modificados

### `src/hooks/use-invoices.ts`
- `useInvoiceDetails`: já busca transactions + installments com categorias — dados suficientes para os novos componentes. A query de installments já inclui `installment_groups(transaction_id, total_installments, transactions:transaction_id(description, deleted_at, categories(id, name, icon, color)))`. Adicionar `date` ao select da transação-pai dos installments para permitir ordenação.

### `src/pages/Faturas.tsx`
Mudanças significativas:

**Navegador mensal:**
- Remover a listagem de todas as faturas (`invoices.map(...)`)
- Adicionar state `selectedInvoiceIndex` controlando qual fatura exibir
- Ao carregar invoices: selecionar automaticamente a primeira `open` por `closing_date ASC`; se nenhuma open, selecionar a mais recente
- Navegador: `< [Mês/Ano] >` entre o seletor de cartão e o card da fatura
- Botões prev/next navegam pelo array de invoices ordenado por `closing_date`
- Desabilitar botão se não houver fatura adjacente
- Ao trocar cartão: reset para a fatura open mais próxima

**Substituir `InvoiceTransactions`:**
- Substituir o componente inline por uma nova renderização usando `InvoiceTransactionItem` e `InvoiceInstallmentGroup`
- Transações diretas → `InvoiceTransactionItem`
- Installments agrupados por `group_id` → `InvoiceInstallmentGroup`
- Ordenar tudo por data intercalada

**Card da fatura selecionada:**
- Sempre expandido (sem toggle expand/collapse — a fatura inteira é visível)
- Mostrar status badge, período do ciclo, vencimento, valor total, botão pagar
- Se computedTotal === 0 e sem transações: EmptyState "Sem lançamentos"

## O que NÃO muda
- `TransactionItem`, `TransactionList`, `TransactionForm`
- `use-transactions.ts`
- Dashboard, Transações
- Lógica de criação/pagamento de faturas
- Banco de dados
- `PayInvoiceModal` (mantida intacta dentro de Faturas.tsx)

