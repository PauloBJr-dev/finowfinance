
# Plano: Simplificação Radical do Sistema de Cartão de Crédito

## ✅ IMPLEMENTADO

### Mudanças Realizadas

#### 1. Nova RPC Simplificada `get_or_create_monthly_invoice`
- ✅ Busca/cria fatura por mês simples (sem lógica complexa de ciclos)
- ✅ Usa primeiro dia do mês como identificador
- ✅ Função auxiliar `get_available_invoices` para listar faturas disponíveis
- ✅ RPC `update_invoice_status` para controle manual de status

#### 2. QuickAddModal Atualizado
- ✅ Seletor de fatura no Step 3 para despesas de cartão
- ✅ Default: fatura do mês seguinte à data da transação
- ✅ Usuário pode escolher qualquer fatura aberta/fechada
- ✅ Auto-select da fatura sugerida

#### 3. Hook use-transactions.ts Simplificado
- ✅ Aceita `selected_invoice_id` do usuário
- ✅ Não calcula ciclos automaticamente para compras à vista
- ✅ Para parcelamento: usa `get_or_create_monthly_invoice` para cada mês

#### 4. Página Faturas com Controle Manual
- ✅ Botões para alterar status: Aberta → Fechada → Paga
- ✅ Menu de ações rápidas em cada card de fatura
- ✅ Filtro mensal mantido (baseado em closing_date)

#### 5. Edge Function cards Corrigida
- ✅ Removida geração automática de faturas (era com schema antigo)
- ✅ Faturas são criadas sob demanda via RPCs

---

## Novas Regras de Negócio Implementadas

1. **Faturas são mensais e identificadas por mês/ano simples**
   - Exemplo: "Fatura de Fevereiro 2026"
   - Sem cálculos complexos de ciclo

2. **Usuário escolhe para qual fatura a despesa vai**
   - Default: mês seguinte à data da transação
   - Usuário pode alterar se desejar

3. **Status da fatura é manual**
   - Usuário marca quando quer: `open` → `closed` → `paid`
   - Sistema não fecha automaticamente

4. **Parcelamento simplificado**
   - Cada parcela vai para a fatura do seu mês correspondente
   - Parcela 1/6 → Fevereiro, Parcela 2/6 → Março, etc.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Novas RPCs: `get_or_create_monthly_invoice`, `get_available_invoices`, `update_invoice_status` |
| `src/hooks/use-invoices.ts` | Novos hooks: `useAvailableInvoices`, `useGetOrCreateMonthlyInvoice`, `useUpdateInvoiceStatus` |
| `src/hooks/use-transactions.ts` | Aceita `selected_invoice_id`, usa nova RPC para parcelamento |
| `src/components/transactions/QuickAddModal.tsx` | Seletor de fatura no Step 3 |
| `src/pages/Faturas.tsx` | Botões de status manual, menu de ações |
| `supabase/functions/cards/index.ts` | Removida geração automática de faturas |
