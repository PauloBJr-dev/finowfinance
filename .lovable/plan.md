
# Plano: Simplificação Radical do Sistema de Cartão de Crédito

## Diagnóstico Completo dos Problemas

Após análise profunda do código e banco de dados, identifiquei múltiplos problemas interconectados:

### 1. Complexidade Excessiva na Lógica de Ciclos
A função `calculate_invoice_cycle` calcula ciclos bancários reais, mas isso cria confusão:
- Usuário seleciona "Janeiro 2026" → sistema cria fatura com `closing_date: 2026-02-01`
- Quando filtra por "Janeiro 2026", a fatura não aparece (pois o fechamento é em fevereiro)

### 2. Edge Function Desatualizada
A Edge Function `cards/index.ts` usa colunas antigas (`reference_month`, `start_date`, `end_date`) que não existem mais no banco. Isso causa falhas silenciosas.

### 3. Frontend vs Backend Desincronizados
- Hook `use-cards.ts` usa RPC `create_initial_invoice` (correto)
- Edge Function `cards` tenta criar faturas com schema antigo (quebrado)
- O sistema tem duas formas de criar faturas e ambas têm problemas

---

## Solução Proposta: Modelo Simplificado

Conforme solicitado, vou **remover a complexidade de ciclos automáticos** e deixar o **usuário no controle total**.

### Novas Regras de Negócio

1. **Faturas são mensais e identificadas por mês/ano simples**
   - Exemplo: "Fatura de Fevereiro 2026"
   - Sem cálculos complexos de ciclo

2. **Usuário escolhe para qual fatura a despesa vai**
   - Ao criar despesa no cartão, sistema sugere fatura do **mês seguinte** como default
   - Exemplo: Compra em 20 de janeiro → sugestão: "Fatura de Fevereiro"
   - Usuário pode alterar se desejar

3. **Status da fatura é manual**
   - Usuário marca quando quer: `open` → `closed` → `paid`
   - Sistema não fecha automaticamente

4. **Parcelamento simplificado**
   - Cada parcela vai para a fatura do seu mês correspondente
   - Parcela 1/6 → Fevereiro, Parcela 2/6 → Março, etc.

---

## Mudanças Técnicas Necessárias

### Banco de Dados

1. **Simplificar a RPC `find_or_create_invoice`**
   - Remover lógica de ciclos
   - Buscar/criar fatura pelo campo `closing_date` como identificador de mês
   - Default: mês seguinte à data da transação

2. **Manter campos existentes, mas simplificar uso**
   - `closing_date` = primeiro dia do mês da fatura (ex: 2026-02-01)
   - `due_date` = dia de vencimento do cartão naquele mês
   - `cycle_start_date` e `cycle_end_date` mantidos para compatibilidade

### Frontend (QuickAddModal)

3. **Adicionar seletor de fatura no Step 3**
   - Mostrar dropdown com faturas abertas do cartão selecionado
   - Default: fatura do mês seguinte
   - Se não existir, criar automaticamente

4. **Atualizar hook `use-transactions.ts`**
   - Usar invoice_id selecionado pelo usuário (não calcular)
   - Remover chamada à RPC complexa para compras à vista

5. **Atualizar página Faturas**
   - Ajustar filtro mensal para usar `closing_date` corretamente
   - Adicionar botões para alterar status manualmente

### Edge Function

6. **Corrigir Edge Function `cards/index.ts`**
   - Atualizar para usar schema correto (`cycle_start_date`, `cycle_end_date`, `closing_date`)
   - Ou remover geração automática de faturas (já que o hook usa RPC)

---

## Cronograma de Implementação

| Ordem | Tarefa | Arquivos |
|-------|--------|----------|
| 1 | Criar nova RPC simplificada `get_or_create_monthly_invoice` | Migration SQL |
| 2 | Adicionar seletor de fatura no QuickAddModal | `QuickAddModal.tsx` |
| 3 | Simplificar hook de criação de transação | `use-transactions.ts` |
| 4 | Corrigir filtro da página Faturas | `Faturas.tsx` |
| 5 | Adicionar botões de status manual | `Faturas.tsx` |
| 6 | Corrigir ou remover Edge Function cards | `cards/index.ts` |

---

## Benefícios da Simplificação

- **Previsibilidade**: usuário sabe exatamente para onde cada despesa vai
- **Menos bugs**: sem cálculos complexos de ciclo
- **Manutenção fácil**: código mais simples e direto
- **Controle total**: usuário decide status e associações

## Próximos Passos

Ao aprovar, implementarei as mudanças na ordem indicada, testando cada etapa antes de prosseguir.
