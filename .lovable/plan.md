
# Plano: Implementacao do Core Financeiro do Finow

## Visao Geral

Implementar o nucleo financeiro funcional do Finow seguindo a ordem de prioridade definida:
**Configuracoes primeiro** → Quick Add/Transacoes → Faturas → Dashboard

---

## Fase 1: Infraestrutura de Hooks e Servicos

### 1.1 Hooks de Dados (React Query)

Criar hooks reutilizaveis para operacoes CRUD com cache e invalidacao automatica:

```text
src/hooks/
├── use-accounts.ts      # CRUD contas
├── use-cards.ts         # CRUD cartoes
├── use-transactions.ts  # CRUD transacoes
├── use-invoices.ts      # Leitura faturas + pagamento
├── use-categories.ts    # Leitura categorias
└── use-profile.ts       # Leitura perfil usuario
```

Cada hook expoe:
- `useQuery` para leitura (com filtro `deleted_at IS NULL`)
- `useMutation` para create/update/soft-delete
- Invalidacao de queries relacionadas apos mutacoes

### 1.2 Utilitarios

```text
src/lib/
├── format.ts        # formatCurrency, formatDate, formatMonth
├── invoice-utils.ts # calcularFatura, encontrarFaturaCorreta
└── installment-utils.ts # calcularParcelas (resto na ultima)
```

---

## Fase 2: Componentes Compartilhados

### 2.1 Componente de Confirmacao de Exclusao (Bottom Sheet)

```text
src/components/shared/DeleteConfirmation.tsx
```

- Usa `Drawer` (vaul) para mobile-first
- Checkbox "Eu entendo que esta acao nao pode ser desfeita"
- Botao desabilitado ate marcar checkbox
- Cor do botao: `destructive` (nao vermelho puro, conforme design system)

### 2.2 Snackbar de Undo (8 segundos)

```text
src/components/shared/UndoToast.tsx
```

- Usa `sonner` com duracao customizada de 8000ms
- Acao "Desfazer" que restaura `deleted_at = NULL`
- Microfeedback claro: "Transacao excluida. Desfazer?"

### 2.3 Seletor de Metodo de Pagamento

```text
src/components/shared/PaymentMethodSelect.tsx
```

- Radio group visual com icones
- Opcoes: Dinheiro, Debito, Pix, Transferencia, Boleto, Cartao de Credito, Voucher

### 2.4 Seletor de Categoria

```text
src/components/shared/CategorySelect.tsx
```

- Grid de categorias com icones coloridos
- Filtra por tipo (expense/income)
- Busca do usuario + categorias de sistema

---

## Fase 3: Pagina de Configuracoes (Prioridade)

### 3.1 Estrutura com Tabs

```text
src/pages/Configuracoes.tsx
  ├── Tab: Contas
  ├── Tab: Cartoes
  ├── Tab: Perfil
  └── Tab: Preferencias (placeholder futuro)
```

### 3.2 Tab Contas - CRUD Completo

**Listagem:**
- Cards com nome, tipo, saldo atual
- Icones por tipo (carteira = cash, banco = checking, etc)
- Badge para `benefit_card` indicando "Vale"

**Formulario (Sheet/Drawer):**
| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| nome | text | Sim |
| tipo | select (account_type) | Sim |
| saldo_inicial | currency input | Sim |
| incluir_no_patrimonio | switch | Nao (default true) |

**Regras especiais para `benefit_card`:**
- Mostrar campo adicional `operadora` no nome
- Opcao de registrar deposito manual
- Ao salvar deposito: cria transacao income + exibe toast:
  "R$ X creditados no Vale Alimentacao (Operadora). Saldo: R$ Y."

**Exclusao:**
- Bottom sheet com checkbox "Eu entendo"
- Soft delete (deleted_at = now())
- Undo snackbar 8s

### 3.3 Tab Cartoes - CRUD Completo

**Listagem:**
- Cards com nome, limite, dias de fechamento/vencimento
- Indicador visual do limite usado (baseado na fatura aberta)

**Formulario (Sheet/Drawer):**
| Campo | Tipo | Obrigatorio |
|-------|------|-------------|
| nome | text | Sim |
| limite | currency input | Sim |
| dia_fechamento | number (1-31) | Sim |
| dia_vencimento | number (1-31) | Sim |

**Ao criar cartao:**
- Criar automaticamente fatura do mes atual (status: open)
- Criar fatura do proximo mes (status: open)

**Exclusao:**
- Mesmo padrao: bottom sheet + undo 8s

### 3.4 Tab Perfil

- Exibir nome e email (readonly email)
- Editar nome e telefone
- Timezone (readonly: America/Sao_Paulo)

---

## Fase 4: Quick Add e Transacoes

### 4.1 Modal Quick Add (3 passos max)

O FAB abre um `Dialog` (desktop) ou `Drawer` (mobile):

**Passo 1 - Tipo e Valor:**
- Toggle: Despesa / Receita
- Input de valor (numerico, formatado BRL)
- Data (default: hoje, editavel via calendar picker)

**Passo 2 - Detalhes:**
- Categoria (grid visual)
- Metodo de pagamento
- Descricao (opcional)
- Tags (opcional, input de chips)

**Passo 3 - Conta/Cartao:**
- Se cartao de credito:
  - Selecionar cartao
  - Perguntar: "E parcelado?" (switch)
  - Se sim: input numero de parcelas
  - Preview compacto: "3x de R$ 166,67 (ultima: R$ 166,66)"
- Se outro metodo:
  - Selecionar conta de origem

**Ao confirmar:**
1. Criar transacao
2. Se cartao:
   - Encontrar fatura correta (open ou proxima se closed)
   - Associar transacao a fatura
   - Se parcelado: criar InstallmentGroup + N installments
3. Atualizar saldo da conta (se aplicavel)
4. Invalidar queries do dashboard
5. Toast: "Compra de R$ X adicionada a fatura de Maio"

### 4.2 Pagina Transacoes

**Listagem:**
- Lista agrupada por data (hoje, ontem, esta semana, este mes)
- Cada item mostra: icone categoria, descricao, valor, metodo
- Cores: verde para income, vermelho-suave para expense

**Filtros:**
- Periodo (mes atual default)
- Tipo (todos, despesas, receitas)
- Categoria
- Conta/Cartao

**Acoes:**
- Tap: abre detalhes/edicao
- Swipe left (mobile): opcao excluir
- Botao editar: abre formulario preenchido
- Exclusao: bottom sheet + undo

### 4.3 Logica de Parcelamento

```text
Entrada: total = R$ 500, parcelas = 3
Calculo:
  - valor_base = floor(500 / 3 * 100) / 100 = 166.66
  - resto = 500 - (166.66 * 3) = 0.02
  - ultima_parcela = 166.66 + 0.02 = 166.68

Resultado:
  - Parcela 1: R$ 166.66 (fatura atual ou proxima)
  - Parcela 2: R$ 166.66 (fatura +1 mes)
  - Parcela 3: R$ 166.68 (fatura +2 meses)
```

Regra de fatura fechada:
- Se fatura do mes atual tem status `closed` ou `paid`:
  - Parcela 1 vai para a fatura do proximo mes
  - Demais parcelas seguem sequencialmente

---

## Fase 5: Faturas

### 5.1 Pagina Faturas

**Listagem:**
- Agrupado por cartao
- Cada fatura mostra: mes referencia, valor total, status (badge colorido)
- Status colors: open = primary, closed = warning, paid = success, overdue = destructive

**Detalhes da Fatura (ao clicar):**
- Header com valor total e status
- Lista de transacoes/parcelas da fatura
- Periodo (data inicio - data fim)
- Data de vencimento

**Botao "Pagar Fatura" (apenas se status != paid):**
- Abre sheet para selecionar conta de pagamento
- Mostra valor total
- Confirmar executa:
  1. `PATCH /invoices/:id` → status = 'paid', paid_at = now()
  2. Criar transacao de debito na conta selecionada
  3. Atualizar parcelas vinculadas para `reconciled`
  4. Atualizar saldo da conta
  5. Toast: "Fatura de Maio paga com sucesso!"

### 5.2 Geracao Automatica de Faturas

Ao criar cartao, gerar automaticamente:
- Fatura do mes atual (baseada em billing_day)
- Fatura do proximo mes

Ao criar transacao em cartao, verificar:
- Se nao existe fatura para o periodo da transacao, criar

Campos da fatura:
```text
card_id: UUID do cartao
reference_month: primeiro dia do mes (ex: 2026-01-01)
start_date: dia apos fechamento do mes anterior
end_date: dia do fechamento
due_date: dia do vencimento
status: 'open'
total_amount: 0 (atualizado ao adicionar transacoes)
```

---

## Fase 6: Dashboard

### 6.1 Saudacao Personalizada

```text
const hora = new Date().getHours();
let saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
// Exibir: "Bom dia, João!" (primeiro nome do profile)
```

### 6.2 Cards de Resumo

**Card Saldo Total:**
- Soma de `current_balance` de todas as contas com `include_in_net_worth = true`
- Cor: primary

**Card Despesas do Mes:**
- Soma de transacoes expense do mes atual (incluindo cartao)
- Cor: destructive-soft

**Card Receitas do Mes:**
- Soma de transacoes income do mes atual
- Cor: success

**Card Fatura Atual:**
- Mostra fatura aberta do primeiro cartao (ou maior valor)
- Valor total e data de vencimento
- Link para pagina de faturas

### 6.3 CTA Principal

Botao "Adicionar transacao" que abre o Quick Add
(Alem do FAB sempre visivel)

### 6.4 Transacoes Recentes

Lista das 5 ultimas transacoes com link "Ver todas"

---

## Fase 7: Edge Functions (Backend)

### 7.1 /accounts

**GET:**
- Retorna contas do usuario onde `deleted_at IS NULL`
- Suporta `?include_deleted=true`

**POST:**
- Cria conta com `current_balance = initial_balance`

**PUT /accounts/:id:**
- Atualiza campos permitidos
- Nao permitir alterar `user_id`

**DELETE /accounts/:id:**
- Soft delete: `UPDATE SET deleted_at = now()`

### 7.2 /cards

Mesmo padrao de /accounts

**POST adicional:**
- Ao criar cartao, criar faturas automaticamente

### 7.3 /transactions

**GET:**
- Suporta filtros: start_date, end_date, type, category_id, account_id, card_id
- Paginacao: limit, offset
- Retorna com dados relacionados (categoria, conta, cartao)

**POST:**
- Validar campos obrigatorios
- Se `payment_method = credit_card`:
  - Encontrar/criar fatura correta
  - Associar `invoice_id`
  - Se `installments > 1`: criar InstallmentGroup + parcelas
- Se conta: atualizar `current_balance`

**PUT /transactions/:id:**
- Recalcular saldos se valor/conta mudou

**DELETE:**
- Soft delete
- Reverter saldo se aplicavel

### 7.4 /invoices

**GET:**
- Lista faturas com filtros: card_id, status
- Inclui transacoes/parcelas relacionadas

### 7.5 /pay-invoice

**POST:**
- Validar fatura pertence ao usuario e nao esta paga
- Validar conta existe e pertence ao usuario
- Em transacao:
  1. Atualizar fatura: status = 'paid', paid_at, paid_from_account_id
  2. Criar transacao de despesa na conta
  3. Atualizar installments para 'reconciled'
  4. Atualizar saldo da conta

---

## Estrutura de Arquivos a Criar

```text
src/
├── hooks/
│   ├── use-accounts.ts
│   ├── use-cards.ts
│   ├── use-transactions.ts
│   ├── use-invoices.ts
│   ├── use-categories.ts
│   └── use-profile.ts
├── lib/
│   ├── format.ts
│   ├── invoice-utils.ts
│   └── installment-utils.ts
├── components/
│   ├── shared/
│   │   ├── DeleteConfirmation.tsx
│   │   ├── UndoToast.tsx
│   │   ├── PaymentMethodSelect.tsx
│   │   ├── CategorySelect.tsx
│   │   ├── CurrencyInput.tsx
│   │   └── EmptyState.tsx
│   ├── accounts/
│   │   ├── AccountList.tsx
│   │   ├── AccountCard.tsx
│   │   ├── AccountForm.tsx
│   │   └── BenefitDepositForm.tsx
│   ├── cards/
│   │   ├── CardList.tsx
│   │   ├── CreditCardItem.tsx
│   │   └── CardForm.tsx
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionItem.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionFilters.tsx
│   │   └── QuickAddModal.tsx
│   ├── invoices/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceCard.tsx
│   │   ├── InvoiceDetails.tsx
│   │   └── PayInvoiceSheet.tsx
│   └── dashboard/
│       ├── GreetingCard.tsx
│       ├── SummaryCards.tsx
│       ├── CurrentInvoiceCard.tsx
│       └── RecentTransactions.tsx
└── pages/
    ├── Dashboard.tsx (atualizar)
    ├── Transacoes.tsx (atualizar)
    ├── Faturas.tsx (atualizar)
    └── Configuracoes.tsx (atualizar)

supabase/functions/
├── accounts/index.ts (implementar logica)
├── cards/index.ts (implementar logica)
├── transactions/index.ts (implementar logica)
├── invoices/index.ts (implementar logica)
└── pay-invoice/index.ts (implementar logica)
```

---

## Validacao com Zod

Schemas de validacao para formularios:

```text
accountSchema: name (min 2), type (enum), initial_balance (number >= 0)
cardSchema: name (min 2), credit_limit (> 0), billing_day (1-31), due_day (1-31)
transactionSchema: amount (> 0), type (enum), payment_method (enum), date, category_id
```

---

## Ordem de Implementacao

1. **Hooks e Utilitarios** - base para tudo
2. **Componentes Compartilhados** - DeleteConfirmation, UndoToast, etc
3. **Pagina Configuracoes** - Tab Contas + Tab Cartoes + Tab Perfil
4. **Edge Functions** - accounts, cards (CRUD completo)
5. **Quick Add Modal** - fluxo de 3 passos
6. **Pagina Transacoes** - listagem + filtros + edicao
7. **Edge Functions** - transactions, invoices, pay-invoice
8. **Pagina Faturas** - listagem + detalhes + pagamento
9. **Dashboard** - todos os cards + transacoes recentes

---

## Consideracoes de Performance

- React Query com `staleTime: 5 * 60 * 1000` (5 min) para dados que mudam pouco
- Invalidacao seletiva apos mutacoes
- Skeleton loading em todas as listas
- Debounce em inputs de busca/filtro (300ms)

## Acessibilidade

- Todos os botoes com `aria-label` descritivo
- Focus trap em modais/sheets
- Anuncio de toasts para screen readers
- Cores com contraste WCAG AA

