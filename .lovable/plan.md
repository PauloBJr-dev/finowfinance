
# Relatório de Auditoria Completa - FINOW

## Resumo Executivo

Após análise profunda e exaustiva de todo o código (frontend, backend, Edge Functions, triggers e dados), foram identificados **12 problemas críticos** e **8 problemas menores** que comprometem a integridade financeira e consistência do sistema.

---

## PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. DUPLICIDADE DE ATUALIZAÇÃO DE SALDO (CRÍTICO)

**Localização:**
- `src/hooks/use-transactions.ts` (linhas 272-292, 375-395)
- `supabase/migrations/20260124150248_...` (trigger `trigger_update_account_balance`)

**Problema:**
O sistema atualiza o saldo das contas **DUAS VEZES**:
1. Via trigger de banco de dados (automático ao INSERT/UPDATE/DELETE)
2. Via código frontend no hook `useCreateTransaction` e `useDeleteTransaction`

**Impacto:**
Cada transação impacta o saldo duas vezes, causando discrepâncias financeiras (ex: depósito de R$200 adiciona R$400 ao saldo).

**Correção:**
Remover a lógica manual de atualização de saldo nos hooks frontend, confiando apenas nos triggers do banco.

---

### 2. TRANSAÇÕES DE CARTÃO SEM INVOICE_ID (CRÍTICO)

**Evidência nos dados:**
```sql
SELECT * FROM transactions WHERE card_id IS NOT NULL;
-- Resultado: 5 transações, TODAS com invoice_id = NULL
```

**Problema:**
Transações de cartão de crédito criadas via Quick Add não estão sendo vinculadas às faturas corretamente. O hook `useCreateTransaction` tenta atualizar `invoice_id`, mas há uma condição de corrida ou falha silenciosa.

**Impacto:**
- Faturas mostram R$ 0,00 apesar de haver compras
- Dashboard mostra fatura vazia
- Pagamento de fatura não inclui essas despesas

**Correção:**
Refatorar a lógica de criação de transação para garantir o vínculo com a fatura em uma transação atômica.

---

### 3. TRIGGER DE AUDITORIA FALHA EM TABELAS SEM DELETED_AT (CRÍTICO)

**Erro nos logs do Postgres:**
```
ERROR: record "old" has no field "deleted_at"
```

**Problema:**
O trigger `create_audit_log()` tenta acessar `OLD.deleted_at` e `NEW.deleted_at` em TODAS as tabelas, mas tabelas como `invoices` e `installments` podem não ter esse campo em alguns contextos.

**Impacto:**
Erro silencioso que pode bloquear operações ou gerar logs incorretos.

**Correção:**
Adicionar verificação condicional para existência do campo antes de acessá-lo.

---

### 4. DUPLICIDADE EM PAGAMENTO DE FATURA (CRÍTICO)

**Localização:**
- `src/hooks/use-invoices.ts` (linhas 207-239)
- `supabase/functions/pay-invoice/index.ts` (linhas 129-157)
- Trigger `trigger_update_account_balance`

**Problema:**
Ao pagar uma fatura:
1. O hook/Edge Function cria uma transação de despesa
2. O trigger `trigger_update_account_balance` deduz do saldo automaticamente
3. O hook também deduz manualmente (linhas 223-239)

**Impacto:**
Saldo é deduzido DUAS vezes ao pagar fatura.

**Correção:**
Remover dedução manual no hook `usePayInvoice`, mantendo apenas a via trigger.

---

### 5. PARCELAS NÃO ESTÃO SENDO CRIADAS (CRÍTICO)

**Evidência nos dados:**
```sql
SELECT * FROM installments;
-- Resultado: 0 registros
```

**Problema:**
O código para criar parcelas existe, mas nunca é executado corretamente. O hook `useCreateTransaction` não está chamando a edge function que implementa a lógica completa de parcelamento.

**Impacto:**
Parcelamento não funciona - apenas a transação principal é criada.

**Correção:**
O Quick Add deve usar a Edge Function `/transactions` ao invés de inserir diretamente via Supabase client.

---

### 6. TOTAIS DE FATURAS ESTÃO ZERADOS (CRÍTICO)

**Evidência nos dados:**
```sql
SELECT total_amount FROM invoices;
-- Resultado: todas com 0.00
```

**Problema:**
Como `invoice_id` é NULL nas transações, o trigger `trigger_update_invoice_total` nunca é acionado.

**Impacto:**
Faturas sempre mostram R$ 0,00.

**Correção:**
Corrigir problema #2 (vinculação de transações com faturas).

---

### 7. TRANSACTIONFORM NÃO PASSA transactionType PARA PaymentMethodSelect (MÉDIO)

**Localização:**
`src/components/transactions/TransactionForm.tsx` (linha 162-164)

**Problema:**
```tsx
<PaymentMethodSelect
  value={paymentMethod}
  onChange={(v) => setPaymentMethod(v as PaymentMethod)}
  // Falta: transactionType={type}
/>
```

Receitas podem ter cartão de crédito selecionado na edição.

**Correção:**
Adicionar `transactionType={type}` ao componente.

---

### 8. EDGE FUNCTION TRANSACTIONS NÃO ESTÁ SENDO USADA (MÉDIO)

**Problema:**
O frontend usa diretamente `supabase.from("transactions").insert()` ao invés de chamar a Edge Function `/transactions`, que tem a lógica correta de parcelamento e vinculação com faturas.

**Correção:**
Refatorar `useCreateTransaction` para usar `supabase.functions.invoke("transactions")`.

---

## PROBLEMAS MENORES

### 9. Código Morto em use-invoices.ts
Função `useUpdateInvoiceTotal` nunca é chamada (duplica funcionalidade do trigger).

### 10. Código Morto em use-accounts.ts  
Função `useUpdateAccountBalance` duplica funcionalidade do trigger.

### 11. Falta de Tipo Estrito em PaymentMethodSelect
`onChange` aceita `(value: PaymentMethod) => void` mas é chamado com `(v) => setPaymentMethod(v as PaymentMethod)`.

### 12. TransactionItem usa ícone genérico para categorias desconhecidas
Não há mapeamento para ícones como "shopping-bag", "utensils", etc.

### 13. Categorias não têm mapeamento correto de ícones
O `iconMap` em CategorySelect.tsx usa PascalCase (`ShoppingBag`) mas o banco usa kebab-case (`shopping-bag`).

### 14. Stale Time muito alto em algumas queries
`useCategories` tem 10 minutos, pode causar dados desatualizados.

### 15. Falta de Loading State no botão de pagamento de fatura
O diálogo não mostra feedback visual enquanto processa.

### 16. TransactionForm não tem scroll interno
Em mobile, campos podem ficar cortados.

---

## CORREÇÕES NECESSÁRIAS

### Fase 1: Corrigir Duplicidade Financeira

**Arquivo: `src/hooks/use-transactions.ts`**

Remover linhas 272-292 (atualização manual de saldo) e linhas 375-395 (reversão manual).

**Arquivo: `src/hooks/use-invoices.ts`**

Remover linhas 223-239 (dedução manual de saldo).

---

### Fase 2: Corrigir Vinculação de Transações com Faturas

**Arquivo: `src/hooks/use-transactions.ts`**

Refatorar `useCreateTransaction` para usar a Edge Function:

```typescript
// Antes:
const { data: newTransaction } = await supabase
  .from("transactions")
  .insert({ ... })

// Depois:
const { data, error } = await supabase.functions.invoke("transactions", {
  method: "POST",
  body: { ... }
});
```

---

### Fase 3: Corrigir Trigger de Auditoria

**Nova Migration:**

```sql
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action audit_action;
  v_old_value JSONB;
  v_new_value JSONB;
  v_has_deleted_at BOOLEAN;
BEGIN
  -- Verificar se tabela tem campo deleted_at
  v_has_deleted_at := EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = TG_TABLE_NAME 
    AND column_name = 'deleted_at'
  );

  -- Determinar user_id
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Determinar acao
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_value := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_has_deleted_at THEN
      IF (OLD->>'deleted_at') IS NULL AND (NEW->>'deleted_at') IS NOT NULL THEN
        v_action := 'delete';
      ELSIF (OLD->>'deleted_at') IS NOT NULL AND (NEW->>'deleted_at') IS NULL THEN
        v_action := 'restore';
      ELSE
        v_action := 'update';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_value := to_jsonb(OLD);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (v_user_id, v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old_value, v_new_value);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### Fase 4: Corrigir Mapeamento de Icones

**Arquivo: `src/components/shared/CategorySelect.tsx`**

Adicionar mapeamento kebab-case para PascalCase:

```typescript
const iconNameMap: Record<string, string> = {
  "shopping-bag": "ShoppingBag",
  "utensils": "Utensils",
  "car": "Car",
  "home": "Home",
  // ... etc
};

const resolveIconName = (icon: string | null): string => {
  if (!icon) return "Tag";
  return iconNameMap[icon] || icon;
};
```

---

### Fase 5: Corrigir Dados Existentes

**Migration para recalcular saldos e totais:**

```sql
-- 1. Vincular transacoes de cartao as faturas corretas
UPDATE transactions t
SET invoice_id = (
  SELECT i.id FROM invoices i
  WHERE i.card_id = t.card_id
  AND i.status = 'open'
  ORDER BY i.reference_month ASC
  LIMIT 1
)
WHERE t.payment_method = 'credit_card'
AND t.card_id IS NOT NULL
AND t.invoice_id IS NULL
AND t.deleted_at IS NULL;

-- 2. Recalcular totais das faturas
UPDATE invoices i
SET total_amount = COALESCE((
  SELECT SUM(t.amount)
  FROM transactions t
  WHERE t.invoice_id = i.id
  AND t.deleted_at IS NULL
), 0);

-- 3. Recalcular saldos das contas (baseado em initial_balance + transacoes)
UPDATE accounts a
SET current_balance = a.initial_balance + COALESCE((
  SELECT SUM(
    CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
  )
  FROM transactions t
  WHERE t.account_id = a.id
  AND t.deleted_at IS NULL
  AND t.payment_method != 'credit_card'
), 0);
```

---

### Fase 6: Adicionar transactionType ao TransactionForm

**Arquivo: `src/components/transactions/TransactionForm.tsx`**

Linha 162:
```tsx
<PaymentMethodSelect
  value={paymentMethod}
  onChange={(v) => setPaymentMethod(v as PaymentMethod)}
  transactionType={type}  // Adicionar
/>
```

---

### Fase 7: Remover Codigo Morto

**Arquivo: `src/hooks/use-accounts.ts`**

Remover funcao `useUpdateAccountBalance` (linhas 179-220) - duplica trigger.

**Arquivo: `src/hooks/use-invoices.ts`**

Remover funcao `useUpdateInvoiceTotal` (linhas 273-309) - duplica trigger.

---

## ARQUIVOS A MODIFICAR

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/hooks/use-transactions.ts` | Remover duplicidade, usar Edge Function |
| `src/hooks/use-invoices.ts` | Remover duplicidade de saldo |
| `src/hooks/use-accounts.ts` | Remover funcao nao utilizada |
| `src/components/transactions/TransactionForm.tsx` | Adicionar transactionType |
| `src/components/shared/CategorySelect.tsx` | Corrigir mapeamento icones |
| Nova Migration | Corrigir trigger audit + dados |

---

## RESULTADO ESPERADO

Apos as correcoes:

1. Cada transacao impacta o saldo UMA unica vez (via trigger)
2. Transacoes de cartao serao vinculadas corretamente as faturas
3. Totais de faturas refletirao despesas reais
4. Dashboard mostrara valores corretos
5. Parcelamento funcionara conforme especificado
6. Sistema auditoria funcionara sem erros
7. Codigo mais limpo e previsivel

---

## PRIORIDADE DE EXECUCAO

| Prioridade | Correcao | Risco |
|------------|----------|-------|
| P0 | Remover duplicidade saldo (Fase 1) | Financeiro critico |
| P0 | Vincular transacoes a faturas (Fase 2) | Funcional critico |
| P1 | Corrigir trigger auditoria (Fase 3) | Erros silenciosos |
| P1 | Recalcular dados existentes (Fase 5) | Dados incorretos |
| P2 | Corrigir mapeamento icones (Fase 4) | Visual |
| P2 | Passar transactionType (Fase 6) | UX |
| P3 | Remover codigo morto (Fase 7) | Manutencao |
