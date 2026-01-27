
# Relatório de Auditoria da Arquitetura - Finow

## Resumo Executivo

O projeto Finow apresenta uma estrutura razoavelmente organizada para um MVP, mas possui diversas oportunidades de melhoria em termos de modularidade, separação de responsabilidades e manutenibilidade. Este relatório identifica problemas críticos, questões de arquitetura e recomendações priorizadas.

---

## 1. Problemas Críticos (Prioridade Alta)

### 1.1 Duplicação de Lógica de Negócio: Frontend vs Edge Function

**Localização**: `src/hooks/use-transactions.ts` (linhas 160-255) vs `supabase/functions/transactions/index.ts` (linhas 230-360)

**Problema**: A lógica de criação de transações com parcelamento existe **duplicada** em dois lugares:
- O hook `useCreateTransaction` implementa toda a lógica de parcelas no frontend
- A Edge Function `transactions/index.ts` também implementa a mesma lógica

**Impacto**: 
- Manutenção dobrada para qualquer mudança
- Risco de inconsistência entre as duas implementações
- Atualmente o frontend usa o hook diretamente (não a Edge Function), tornando a Edge Function potencialmente morta

**Recomendação**: Consolidar em um único local. Opções:
- A) Mover toda lógica complexa para Edge Function e usar apenas no frontend
- B) Manter no frontend e remover/simplificar a Edge Function

---

### 1.2 Acoplamento Excessivo no QuickAddModal

**Localização**: `src/components/transactions/QuickAddModal.tsx` (746 linhas)

**Problema**: Este arquivo é um "God Component" que:
- Gerencia 15+ estados locais diferentes
- Contém lógica de negócio (cálculos de parcelas, validações)
- Mistura fluxos diferentes (transação normal, conta a pagar, benefício)
- Implementa wizard de 3 etapas com lógica condicional complexa

**Impacto**: 
- Difícil de testar
- Difícil de manter
- Alto risco de regressões

**Recomendação**: Decompor em:
```
QuickAddModal/
├── index.tsx (orquestrador)
├── useQuickAddState.ts (hook de estado)
├── steps/
│   ├── Step1TypeAmount.tsx
│   ├── Step2CategoryMethod.tsx
│   └── Step3Confirmation.tsx
├── forms/
│   ├── TransactionForm.tsx
│   └── BillForm.tsx
└── utils/
    └── validation.ts
```

---

### 1.3 Inconsistência no Sistema de Toast

**Localização**: `src/hooks/use-bills.ts` vs `src/hooks/use-accounts.ts`

**Problema**: Dois sistemas de toast diferentes são usados:
- `use-bills.ts` importa de `@/hooks/use-toast` (shadcn toast)
- `use-accounts.ts` e outros importam de `sonner`

**Impacto**: Experiência de usuário inconsistente, dois sistemas para manter

**Recomendação**: Padronizar em `sonner` (já é o mais usado no projeto)

---

## 2. Problemas de Arquitetura (Prioridade Média)

### 2.1 Lógica de Negócio Misturada em Hooks de Dados

**Localização**: `src/hooks/use-invoices.ts` (linhas 172-260)

**Problema**: O hook `usePayInvoice` contém lógica de negócio complexa:
- Validação de status da fatura
- Criação de transação
- Atualização de múltiplas tabelas
- Marcação de parcelas como reconciliadas

**Melhor Prática**: Hooks React Query devem ser wrappers finos. Lógica complexa deve estar em:
- Services/Use Cases separados, ou
- Edge Functions (server-side)

**Recomendação**: Mover para Edge Function `pay-invoice` (que já existe mas não é usada pelo hook)

---

### 2.2 Utilitários de Formatação Duplicados

**Localização**: 
- `src/lib/format.ts` → `formatCurrency`
- `src/lib/installment-utils.ts` → cria seu próprio `Intl.NumberFormat`
- `src/components/shared/CurrencyInput.tsx` → define `formatCurrency` interno

**Problema**: Três implementações diferentes da mesma funcionalidade

**Recomendação**: Usar exclusivamente `src/lib/format.ts` em todo o projeto

---

### 2.3 Ausência de Camada de Services

**Problema Geral**: O projeto não possui uma camada de serviços. Toda lógica de negócio está espalhada entre:
- Hooks (`use-*.ts`)
- Edge Functions (`supabase/functions/*`)
- Triggers SQL (no banco)

**Estrutura Atual**:
```
Component → Hook → Supabase Client (direto)
```

**Estrutura Recomendada**:
```
Component → Hook → Service → Supabase Client
                         ↘ Edge Function (para operações complexas)
```

---

### 2.4 Tipos Inconsistentes para PaymentMethod

**Localização**: 
- `src/components/shared/PaymentMethodSelect.tsx` → inclui `benefit_card`
- `src/hooks/use-transactions.ts` → não inclui `benefit_card`
- `supabase/functions/transactions/index.ts` → não conhece `benefit_card`
- Banco de dados → enum não tem `benefit_card` (usa `voucher`)

**Problema**: O tipo `benefit_card` existe apenas no frontend e é mapeado para `voucher` antes de salvar. Isso cria confusão e pode causar bugs.

**Recomendação**: Adicionar `benefit_card` ao enum do banco ou criar constantes centralizadas com mapeamento explícito.

---

## 3. Problemas de Organização (Prioridade Baixa)

### 3.1 Componente NavLink Deslocado

**Localização**: `src/components/NavLink.tsx`

**Problema**: Único componente na raiz de `/components`, fora de qualquer pasta

**Recomendação**: Mover para `src/components/navigation/NavLink.tsx`

---

### 3.2 Contextos Não Padronizados

**Localização**: 
- `src/contexts/SidebarContext.tsx` → usa pasta `/contexts`
- `src/hooks/use-auth.tsx` → contexto definido dentro do hook
- `src/hooks/use-theme.tsx` → contexto definido dentro do hook

**Problema**: Contextos estão em locais diferentes

**Recomendação**: Padronizar. Opções:
- A) Mover todos para `/contexts`
- B) Manter todos como hooks (atual padrão do Next.js/Remix)

---

### 3.3 Edge Function pay-invoice Não Utilizada

**Localização**: `supabase/functions/pay-invoice/index.ts`

**Problema**: Esta Edge Function existe mas não é chamada pelo frontend. O hook `usePayInvoice` faz as operações diretamente.

**Recomendação**: 
- Usar a Edge Function existente, ou
- Remover se não for necessária

---

### 3.4 Arquivos de Tipos Espalhados

**Problema**: Tipos são definidos inline em cada arquivo ou importados de `@/integrations/supabase/types`. Não há arquivo central de tipos de domínio.

**Recomendação**: Criar `src/types/` com:
```
types/
├── index.ts
├── transactions.ts
├── invoices.ts
├── accounts.ts
└── enums.ts
```

---

## 4. Oportunidades de Melhoria

### 4.1 Validação de Formulários Inconsistente

**Problema**: O projeto usa `react-hook-form` + `zod`, mas vários formulários (QuickAddModal, TransactionForm) fazem validação manual.

**Recomendação**: Criar schemas Zod centralizados e usar consistentemente com react-hook-form.

---

### 4.2 Ausência de Testes de Integração

**Localização**: `src/test/example.test.ts`

**Problema**: Apenas um teste de exemplo existe. Hooks críticos como `useCreateTransaction` não têm testes.

**Recomendação**: Adicionar testes para:
- Hooks de transações (lógica de parcelamento)
- Lógica de faturas
- Componentes compartilhados

---

### 4.3 Constantes Mágicas Espalhadas

**Exemplos**:
- `5000` (limite de tokens) aparece em múltiplos arquivos
- `30` (dias de soft delete) não está centralizado
- `48` (máximo de parcelas) definido em múltiplos locais

**Recomendação**: Criar `src/lib/constants.ts` para constantes de negócio

---

## 5. Plano de Ação Priorizado

### Fase 1: Correções Críticas (Imediato)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 1 | Unificar sistema de toast para `sonner` | `use-bills.ts` | Baixo |
| 2 | Remover/consolidar lógica duplicada de parcelas | `use-transactions.ts`, Edge Function | Alto |
| 3 | Centralizar formatação de moeda | Vários | Baixo |

### Fase 2: Refatoração de Arquitetura (Curto Prazo)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 4 | Decompor QuickAddModal em subcomponentes | `QuickAddModal.tsx` | Alto |
| 5 | Criar hook customizado para estado do wizard | Novo arquivo | Médio |
| 6 | Decidir: usar Edge Function ou remover `pay-invoice` | `use-invoices.ts`, Edge Function | Médio |

### Fase 3: Organização e Padronização (Médio Prazo)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 7 | Criar diretório `src/types/` para tipos de domínio | Vários | Médio |
| 8 | Mover `NavLink.tsx` para pasta correta | `NavLink.tsx` | Trivial |
| 9 | Criar `src/lib/constants.ts` | Novo arquivo | Baixo |
| 10 | Padronizar localização de contextos | Contextos existentes | Baixo |

### Fase 4: Qualidade e Manutenibilidade (Longo Prazo)

| # | Ação | Arquivos Afetados | Esforço |
|---|------|-------------------|---------|
| 11 | Adicionar testes para hooks críticos | Novos arquivos | Alto |
| 12 | Implementar schemas Zod para formulários | Novos arquivos | Médio |
| 13 | Criar camada de services se necessário | Nova estrutura | Alto |

---

## 6. Métricas de Saúde do Código

| Métrica | Status | Comentário |
|---------|--------|------------|
| Separação UI/Lógica | ⚠️ Parcial | Hooks misturam dados e lógica de negócio |
| Reutilização | ✅ Bom | Componentes shared bem utilizados |
| Consistência de Estilo | ⚠️ Parcial | Toast inconsistente, tipos duplicados |
| Testabilidade | ❌ Fraco | Apenas 1 teste de exemplo |
| Modularidade | ⚠️ Parcial | QuickAddModal muito grande |
| Documentação Inline | ✅ Bom | Comentários explicativos nos hooks |

---

## 7. Conclusão

O projeto Finow possui uma base sólida mas requer atenção em três áreas principais:

1. **Consolidação**: Eliminar duplicação de lógica entre frontend e Edge Functions
2. **Decomposição**: Quebrar componentes grandes em peças menores e testáveis
3. **Padronização**: Unificar sistemas de toast, tipos e formatação

Recomendo começar pela Fase 1 (correções críticas) que trazem ganhos rápidos com baixo risco, e depois avançar para a decomposição do QuickAddModal que é o maior débito técnico identificado.
