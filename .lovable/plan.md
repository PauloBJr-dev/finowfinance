
# Plano: Implementação da Tela de Contas a Pagar

## Visão Geral do Fluxo

```text
[Quick Add - Despesa]
       │
       ▼
┌─────────────────────────────────┐
│   Toggle: "Já paguei?"          │
│   [ON] Pago (padrão)            │
│   [OFF] Não pago                │
└─────────────────────────────────┘
       │
       ├─── ON ───► Fluxo normal (cria transação)
       │
       └─── OFF ──► Novo fluxo:
                      │
                      ▼
              ┌──────────────────────────────┐
              │  Data de vencimento          │
              │  (placeholder: "Quando vence │
              │  esta conta?")               │
              └──────────────────────────────┘
                      │
                      ▼
              ┌──────────────────────────────┐
              │  Recorrência:                │
              │  [Apenas este mês]           │
              │  [Repetir por 6 meses]       │
              └──────────────────────────────┘
                      │
                      ▼
              ┌──────────────────────────────┐
              │  Cria "Conta a Pagar"        │
              │  (não cria transação ainda)  │
              └──────────────────────────────┘
```

---

## 1. Banco de Dados

### Nova Tabela: `bills`

Armazena contas a pagar (pendentes ou pagas).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK para profiles |
| `description` | text | Nome da conta (ex: "Conta de luz") |
| `amount` | numeric | Valor |
| `category_id` | uuid | FK para categories |
| `due_date` | date | Data de vencimento |
| `status` | enum | `pending`, `paid`, `overdue` |
| `recurrence_group_id` | uuid | Agrupa contas recorrentes (nullable) |
| `paid_at` | timestamp | Quando foi marcada como paga |
| `paid_transaction_id` | uuid | FK para transactions (criada ao pagar) |
| `account_id` | uuid | Conta usada para pagamento (nullable até pagar) |
| `payment_method` | enum | Método usado (nullable até pagar) |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Novo Enum: `bill_status`

```sql
CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'overdue');
```

### RLS Policies

- Users can view own bills (user_id = get_current_user_id())
- Users can create own bills
- Users can update own bills
- Users can delete own bills

---

## 2. Modificações no Quick Add

### Step 1 - Após selecionar "Despesa"

Adicionar toggle **"Já paguei?"** com comportamento:

```text
┌─────────────────────────────────────────────┐
│  Despesa          Receita                   │
│  ━━━━━━━━━━━━━    ─────────                 │
│                                             │
│  Quanto gastou?                             │
│  ┌────────────────────────────────────┐     │
│  │ R$ 0,00                            │     │
│  └────────────────────────────────────┘     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  ✓ Já paguei                       │    │
│  │  ────────────────────── [ON]       │    │
│  │  (Desative se esta conta ainda     │    │
│  │   não foi paga)                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Data: 26 de janeiro de 2026                │
│                                             │
│  [Continuar]                                │
└─────────────────────────────────────────────┘
```

### Quando "Já paguei?" está OFF

Transformar em "Conta a Pagar":

```text
┌─────────────────────────────────────────────┐
│  Nova Conta a Pagar                         │
│                                             │
│  Quanto vai pagar?                          │
│  ┌────────────────────────────────────┐     │
│  │ R$ 150,00                          │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Data de vencimento                         │
│  ┌────────────────────────────────────┐     │
│  │ 📅 10 de fevereiro de 2026         │     │
│  └────────────────────────────────────┘     │
│  (Quando esta conta vence?)                 │
│                                             │
│  Esta conta se repete todo mês?             │
│  ┌─────────────────────────────────────┐    │
│  │ ( ) Apenas este mês                 │    │
│  │ (•) Repetir pelos próximos 6 meses  │    │
│  │     (usa a mesma data de vencimento │    │
│  │      para os próximos meses)        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Continuar]                                │
└─────────────────────────────────────────────┘
```

### Step 2 - Categoria (obrigatória)

Mantém o fluxo de categoria existente, mas sem método de pagamento (será definido ao pagar).

### Step 3 - Confirmação

Exibir resumo e confirmar criação da(s) conta(s) a pagar.

---

## 3. Tela de Contas a Pagar

### Header + Filtros

```text
┌─────────────────────────────────────────────┐
│  Contas a Pagar                             │
│  Gerencie suas contas e compromissos.       │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ◄ Janeiro 2026 ►                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [A Vencer] [Vencidas] [Pagas] [Todas]      │
│                                             │
└─────────────────────────────────────────────┘
```

### Card de Conta a Pagar

```text
┌─────────────────────────────────────────────┐
│  [Icone Categoria]                          │
│  Conta de Luz                    R$ 180,00  │
│  Moradia                                    │
│                                             │
│  ⏰ Vence em 5 dias (10/02)      [Pagar]    │
└─────────────────────────────────────────────┘
```

### Estados visuais

- **A vencer (>3 dias)**: Cor neutra
- **Vence em breve (1-3 dias)**: Badge amarelo/warning
- **Vencida**: Badge vermelho/destructive, texto "Vencida há X dias"
- **Paga**: Badge verde, texto "Paga em DD/MM"

### Modal de Pagamento

Ao clicar em "Pagar":

```text
┌─────────────────────────────────────────────┐
│  Pagar Conta                                │
│                                             │
│  Conta de Luz - R$ 180,00                   │
│  Vencimento: 10/02/2026                     │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Forma de pagamento                         │
│  ┌────────────────────────────────────┐     │
│  │ Boleto                             │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Pagar com                                  │
│  ┌────────────────────────────────────┐     │
│  │ Nubank (Conta Corrente)            │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Data do pagamento                          │
│  ┌────────────────────────────────────┐     │
│  │ Hoje (26/01/2026)                  │     │
│  └────────────────────────────────────┘     │
│                                             │
│  [Cancelar]              [Confirmar Pagamento]│
└─────────────────────────────────────────────┘
```

**Ao confirmar**:
1. Atualiza bill.status = 'paid'
2. Cria transação de despesa com os dados
3. Vincula transação à bill (paid_transaction_id)
4. Toast: "Conta paga! Despesa de R$ 180,00 registrada."

---

## 4. Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/xxx_create_bills_table.sql` | DDL da tabela bills |
| `src/hooks/use-bills.ts` | Hooks React Query para CRUD de bills |
| `src/components/bills/BillCard.tsx` | Card individual de conta a pagar |
| `src/components/bills/BillList.tsx` | Lista de contas com filtros |
| `src/components/bills/PayBillModal.tsx` | Modal de pagamento |
| `src/components/bills/BillFilters.tsx` | Filtros (mês, status) |
| `supabase/functions/bills/index.ts` | Edge function para operações |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/transactions/QuickAddModal.tsx` | Adicionar toggle "Já paguei?" e fluxo de conta a pagar |
| `src/pages/ContasPagar.tsx` | Implementar tela completa |
| `src/integrations/supabase/types.ts` | Será atualizado automaticamente |

---

## 5. Regras de Negócio

### Criação de Bills

1. Validar campos obrigatórios: amount, due_date, category_id
2. Se recorrente: criar 6 bills com due_date incrementado mês a mês
3. Todas as bills recorrentes compartilham o mesmo `recurrence_group_id`
4. Status inicial: `pending`

### Atualização de Status

- **Automático via cron/trigger**: Se due_date < hoje e status = pending, mudar para `overdue`
- **Manual**: Ao pagar, mudar para `paid` e criar transação

### Pagamento

1. Criar transação de despesa:
   - amount = bill.amount
   - type = 'expense'
   - category_id = bill.category_id
   - payment_method = selecionado no modal
   - account_id = selecionado no modal
   - date = data do pagamento
   - description = bill.description
2. Atualizar bill:
   - status = 'paid'
   - paid_at = now()
   - paid_transaction_id = transação criada

### Exclusão

- Soft delete padrão
- Se bill está vinculada a transação, manter histórico

---

## 6. Considerações de UX

### Placeholders e Microcopy

- Toggle "Já paguei?": "Desative se esta conta ainda não foi paga"
- Data de vencimento: "Quando esta conta vence?"
- Recorrência: "Gera automaticamente esta conta para os próximos 6 meses, usando a mesma data de vencimento"

### Feedback Visual

- Animação suave ao marcar como paga
- Toast de sucesso com valor
- Contadores no header (ex: "3 contas a vencer")

### Mobile-First

- Cards com swipe para pagar (futuro)
- Bottom sheet para modal de pagamento
- FAB permanece para Quick Add

---

## 7. Sequência de Implementação

1. Migração SQL (criar tabela bills + enum + RLS)
2. Hook `use-bills.ts` com operações CRUD
3. Modificar QuickAddModal para fluxo de contas a pagar
4. Componentes da tela Contas a Pagar (BillCard, BillList, BillFilters)
5. PayBillModal com criação de transação
6. Testes e ajustes de responsividade

---

## Seção Técnica

### SQL da Migração

```sql
-- Enum para status
CREATE TYPE bill_status AS ENUM ('pending', 'paid', 'overdue');

-- Tabela bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  due_date DATE NOT NULL,
  status bill_status NOT NULL DEFAULT 'pending',
  recurrence_group_id UUID,
  paid_at TIMESTAMPTZ,
  paid_transaction_id UUID REFERENCES public.transactions(id),
  account_id UUID REFERENCES public.accounts(id),
  payment_method payment_method,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills"
  ON public.bills FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can create own bills"
  ON public.bills FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update own bills"
  ON public.bills FOR UPDATE
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete own bills"
  ON public.bills FOR DELETE
  USING (user_id = get_current_user_id());

-- Trigger para updated_at
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para audit log
CREATE TRIGGER audit_bills
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Índices
CREATE INDEX idx_bills_user_id ON public.bills(user_id);
CREATE INDEX idx_bills_due_date ON public.bills(due_date);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_recurrence ON public.bills(recurrence_group_id);
```

### Hook Principal (resumo)

```typescript
// use-bills.ts
export function useBills(filters?: BillFilters) { ... }
export function useCreateBill() { ... }
export function usePayBill() { ... } // Marca como pago + cria transação
export function useDeleteBill() { ... }
```

### Estrutura do QuickAddModal

```typescript
// Estados adicionais
const [isPaid, setIsPaid] = useState(true); // Padrão: pago
const [dueDate, setDueDate] = useState<Date | null>(null);
const [isRecurring, setIsRecurring] = useState(false);

// Se !isPaid && type === "expense", redirecionar para fluxo de bills
```
