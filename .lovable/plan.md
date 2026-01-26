
# Plano de Correção: Sistema de Cartões e Faturas

## Resumo do Problema

Foram identificados **3 problemas críticos** que causam o mau funcionamento do sistema de cartões e faturas:

1. **Campo obsoleto no hook de transações**: O hook `use-transactions.ts` usa `reference_month` (obsoleto) ao invés de `closing_date`
2. **Cálculo incorreto na criação de fatura inicial**: A função SQL `create_initial_invoice` está somando dias incorretamente
3. **Lógica duplicada**: O frontend tenta buscar fatura diretamente no banco ao invés de usar a Edge Function

---

## Correções Propostas

### 1. Corrigir Hook `use-transactions.ts`

**Arquivo:** `src/hooks/use-transactions.ts`

**Problema na linha 164:**
```typescript
// ANTES (incorreto - campo obsoleto)
.order("reference_month", { ascending: true })

// DEPOIS (correto)
.order("closing_date", { ascending: true })
```

**Mudança adicional:** Simplificar a lógica de criação de transação para usar a RPC `find_or_create_invoice` diretamente, garantindo que a fatura correta seja sempre encontrada ou criada.

---

### 2. Corrigir Função SQL `create_initial_invoice`

**Problema:** A expressão `p_initial_invoice_month + (v_closing_day - 1)` está incorreta.

Quando o usuário seleciona "Fevereiro de 2026":
- `p_initial_invoice_month = '2026-02-01'`
- `v_closing_day = 1`
- Cálculo: `2026-02-01 + 0 = 2026-02-01`

Mas a função `calculate_invoice_cycle` ao receber `2026-02-01` (que é igual ao dia de fechamento) pode interpretar como "já fechou" e avançar para o próximo ciclo.

**Solução:** Usar o dia do **meio** do mês selecionado para garantir que caia no ciclo correto:

```sql
-- Usar dia 15 do mês selecionado como referência segura
SELECT * INTO v_current_cycle 
FROM calculate_invoice_cycle(
  v_closing_day, 
  v_due_day, 
  p_initial_invoice_month + INTERVAL '14 days'  -- Dia 15 do mês
);
```

---

### 3. Refatorar Criação de Transação no Frontend

**Arquivo:** `src/hooks/use-transactions.ts`

Em vez de buscar a fatura diretamente no banco com query, chamar a RPC que já implementa toda a lógica:

```typescript
if (isCreditCard && transaction.card_id) {
  const { data: invoiceId, error } = await supabase.rpc('find_or_create_invoice', {
    p_card_id: transaction.card_id,
    p_user_id: user.id,
    p_transaction_date: transaction.date || new Date().toISOString().split('T')[0]
  });
  
  if (!error && invoiceId) {
    invoiceId = invoiceId;
  }
}
```

---

### 4. Limpeza de Dados Incorretos (Migration)

Executar migration para:
1. Desvincular transações com `invoice_id` incorretos
2. Recalcular associações usando a função correta
3. Remover faturas duplicadas/órfãs

```sql
-- Limpar transações de cartão sem fatura válida
UPDATE transactions 
SET invoice_id = NULL 
WHERE payment_method = 'credit_card' 
  AND invoice_id IS NOT NULL
  AND invoice_id NOT IN (SELECT id FROM invoices);

-- Reconectar transações às faturas corretas (via função)
-- Será feito via edge function para cada transação
```

---

## Sequência de Implementação

1. **Migration SQL** para corrigir `create_initial_invoice`
2. **Atualizar** `use-transactions.ts` com campo correto e uso de RPC
3. **Testar** cadastro de novo cartão com fatura de Fevereiro
4. **Testar** criação de despesa no cartão
5. **Verificar** que transações aparecem na fatura correta

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-transactions.ts` | Trocar `reference_month` → `closing_date`, usar RPC para buscar fatura |
| Migration SQL | Corrigir função `create_initial_invoice` |
| Migration SQL | Script de limpeza de dados inconsistentes |

### Impacto

- **Novas transações**: Serão associadas corretamente à fatura `open`
- **Novos cartões**: Terão fatura inicial criada no mês correto
- **Dados existentes**: Serão corrigidos via migration

---

## Resultado Esperado

Após as correções:
- ✅ Ao cadastrar cartão com "Fevereiro 2026", cria fatura com `closing_date` em Fevereiro
- ✅ Ao registrar despesa no cartão, aparece imediatamente na fatura aberta
- ✅ Total da fatura atualiza automaticamente (via trigger)
- ✅ Sistema funciona como apps bancários reais (Nubank, Inter, etc.)
