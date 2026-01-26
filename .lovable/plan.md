
# Plano: Implementação de Cartões Benefício (Vale Alimentação/Refeição)

## Resumo
Implementar funcionalidade completa de cartões benefício no Finow, incluindo nova aba nas Configurações, sistema de depósitos/recargas mensais com cálculo de valor diário, integração no Quick Add como método de pagamento e exibição separada no Dashboard.

---

## 1. Estrutura do Banco de Dados

### 1.1 Nova Tabela: `benefit_deposits`
Armazena o histórico de recargas/depósitos dos cartões benefício:

```text
┌─────────────────────────────────────────────────────────┐
│                   benefit_deposits                       │
├─────────────────────────────────────────────────────────┤
│ id              UUID (PK)                               │
│ user_id         UUID (FK → profiles)                    │
│ account_id      UUID (FK → accounts)                    │
│ amount          NUMERIC(15,2) - valor depositado        │
│ date            DATE - data do depósito                 │
│ working_days    INTEGER - dias úteis do mês             │
│ daily_rate      NUMERIC(15,2) - valor/dia calculado     │
│ description     TEXT (opcional)                         │
│ created_at      TIMESTAMPTZ                             │
│ deleted_at      TIMESTAMPTZ (soft delete)               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Trigger para Atualizar Saldo
O depósito cria automaticamente uma transação de receita e atualiza o saldo da conta.

---

## 2. Alterações no Frontend

### 2.1 Nova Aba "Benefícios" nas Configurações
Adicionar 5ª aba na página `/configuracoes`:

```text
┌─────────────────────────────────────────────────────────┐
│  [Contas] [Cartões] [Benefícios] [Perfil] [IA]          │
└─────────────────────────────────────────────────────────┘
```

A aba conterá:
- Listagem de cartões benefício cadastrados
- Botão "Novo Cartão Benefício"
- Card por cartão mostrando: nome, saldo atual, último depósito
- Opções por cartão: Depositar, Editar, Excluir

### 2.2 Formulário de Cadastro de Cartão Benefício
Campos:
- Nome do cartão (ex: "VA Sodexo", "VR Alelo")
- Descrição (opcional)
- Saldo inicial (opcional, default 0)

### 2.3 Formulário de Depósito/Recarga
Modal similar ao Quick Add contendo:
- Valor a ser creditado (com placeholder "R$ 0,00")
- Data (default: hoje, editável via calendário)
- Dias úteis trabalhados no mês
- Cálculo automático do valor/dia (exibido ao usuário)
- Descrição opcional

Ao salvar:
1. Cria registro em `benefit_deposits`
2. Cria transação de receita vinculada à conta
3. Atualiza saldo do cartão benefício
4. Exibe resumo: "R$ X creditados no VA Sodexo. Saldo: R$ Y"

### 2.4 Filtro Mensal na Aba de Benefícios
Navegação "< Jan 2026 >" para ver histórico de depósitos por mês.

---

## 3. Integração no Quick Add

### 3.1 Novo Método de Pagamento
Adicionar "Cartão Benefício" como método principal para despesas:

```text
[Pix/TED] [Débito] [Crédito] [Dinheiro] [Benefício]
```

### 3.2 Fluxo ao Selecionar Cartão Benefício
1. Usuário seleciona "Benefício" como método de pagamento
2. Sistema exibe lista dos cartões benefício cadastrados (se múltiplos)
3. Usuário seleciona qual cartão usar
4. Ao confirmar despesa:
   - Cria transação de despesa
   - Debita valor do saldo do cartão benefício selecionado
   - Transação aparece no histórico de transações

### 3.3 Validação de Saldo
- Não bloquear gastos acima do saldo (apenas exibir alerta)
- Permitir saldo negativo (o usuário pode ter complementado com outro meio)

---

## 4. Dashboard

### 4.1 Card de Saldo do Cartão Benefício
Novo card no Dashboard mostrando:
- "Saldo Vale Alimentação" ou "Saldos Benefícios" (se múltiplos)
- Valor total de todos os cartões benefício
- Badge informando "(não inclui no saldo total)"

```text
┌─────────────────────────────────────────────────────────┐
│ Saldo Total │ Despesas │ Receitas │ Fatura │ Benefícios│
│   R$ 5.000  │ R$ 2.000 │ R$ 3.000 │ R$ 500 │  R$ 800   │
│             │          │          │        │   (VA)    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Comportamento do Patrimônio Líquido
- Manter lógica: contas com `include_in_net_worth = false` não contam
- Por padrão, cartões benefício terão `include_in_net_worth = false`

---

## 5. Preparação para IA (Fase Futura)

### 5.1 Dados Armazenados para Análise
A tabela `benefit_deposits` com `working_days` e `daily_rate` permitirá:
- Calcular média diária de VA/VR por mês
- Comparar gastos diários vs valor recebido por dia
- Gerar insights como: "Você gasta em média R$ 35/dia no VA, mas recebe R$ 30/dia"

### 5.2 Agentes de IA (implementação futura)
- Análise de padrão de gastos em benefícios
- Recomendações de economia
- Alertas quando saldo está baixo

---

## 6. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/benefits/BenefitCardList.tsx` | Lista de cartões benefício |
| `src/components/benefits/BenefitCardForm.tsx` | Form de criar/editar cartão |
| `src/components/benefits/BenefitDepositForm.tsx` | Form de depósito/recarga |
| `src/components/benefits/BenefitDepositHistory.tsx` | Histórico de depósitos |
| `src/hooks/use-benefit-deposits.ts` | Hook para CRUD de depósitos |

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Configuracoes.tsx` | Adicionar 5ª aba "Benefícios" |
| `src/components/shared/PaymentMethodSelect.tsx` | Adicionar método "Benefício" |
| `src/components/transactions/QuickAddModal.tsx` | Lógica para selecionar cartão benefício |
| `src/pages/Dashboard.tsx` | Novo card de saldo de benefícios |
| `src/hooks/use-accounts.ts` | Filtro para contas tipo benefit_card |
| `src/hooks/use-transactions.ts` | Lógica de débito em cartão benefício |

### Migração SQL
- Criar tabela `benefit_deposits`
- Criar trigger para atualizar saldo ao inserir depósito
- Adicionar `payment_method = 'benefit_card'` ao enum (se necessário)

---

## 7. Regras de Negócio Importantes

1. **Depósitos são sempre manuais** - não há integração automática
2. **Saldo pode ficar negativo** - não bloquear transações
3. **Valor/dia é calculado automaticamente** - `amount / working_days`
4. **Transação de receita é criada** - ao depositar, gera entrada no histórico
5. **Soft delete** - exclusões são reversíveis por 30 dias
6. **Não inclui no patrimônio líquido** - comportamento padrão

---

## 8. Fluxo Visual

```text
CADASTRO DO CARTÃO BENEFÍCIO:
Configurações → Benefícios → [+ Novo Cartão]
→ Nome: "VA Sodexo"
→ Descrição: (opcional)
→ Saldo inicial: R$ 0,00
→ [Criar]

DEPÓSITO/RECARGA:
Configurações → Benefícios → [VA Sodexo] → [Depositar]
→ Valor: R$ 660,00
→ Data: 05/02/2026
→ Dias úteis: 22
→ Valor/dia: R$ 30,00 (calculado)
→ Descrição: "Crédito fevereiro"
→ [Confirmar]
→ Toast: "R$ 660 creditados no VA Sodexo. Saldo: R$ 660"

USO NO QUICK ADD:
FAB → [Despesa] → R$ 25,00 → [Continuar]
→ Categoria: Alimentação → [Continuar]
→ Método: [Benefício] → Selecionar "VA Sodexo"
→ [Confirmar]
→ Saldo VA Sodexo: R$ 635,00
```

---

## Seção Técnica

### Estrutura da Migração SQL

```sql
-- 1. Tabela de depósitos
CREATE TABLE benefit_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  working_days INTEGER NOT NULL DEFAULT 22,
  daily_rate NUMERIC(15,2) GENERATED ALWAYS AS (amount / NULLIF(working_days, 0)) STORED,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. RLS policies
-- (similar às outras tabelas)

-- 3. Trigger para criar transação e atualizar saldo
CREATE FUNCTION handle_benefit_deposit() RETURNS trigger ...
```

### Atualização do Enum payment_method
Se necessário, adicionar `benefit_card` ao enum:

```sql
ALTER TYPE payment_method ADD VALUE 'benefit_card';
```

### Hook use-benefit-deposits
Seguirá o padrão dos outros hooks:
- `useBenefitDeposits(accountId, month)` - listar depósitos filtrados
- `useCreateBenefitDeposit()` - criar depósito
- `useDeleteBenefitDeposit()` - soft delete

### Integração no QuickAddModal
Ao selecionar `benefit_card` como método:
1. Mostrar Select com lista de contas tipo `benefit_card`
2. Armazenar `account_id` no estado
3. Ao submeter, criar transação com `payment_method: 'benefit_card'`
