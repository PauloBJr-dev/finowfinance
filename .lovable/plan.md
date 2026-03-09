

# Bug Fix — Formulário de edição não carrega cartão de crédito

## Problema
O `TransactionForm.tsx` não tem estado `cardId`, não importa `useCards`, não renderiza seletor de cartão, e não envia `card_id` no submit. Transações de crédito ficam sem cartão pré-selecionado e falham ao salvar.

## Correção (apenas `TransactionForm.tsx`)

### 1. Adicionar estado e hook
- Importar `useCards` de `@/hooks/use-cards`
- Adicionar estado `cardId: string | null`

### 2. Inicialização no useEffect
- Se `payment_method === 'credit_card'`: popular `cardId` com `transaction.card_id`, limpar `accountId`
- Senão: popular `accountId` com `transaction.account_id`, limpar `cardId`

### 3. Handler de mudança de payment method
- Ao mudar para `credit_card`: limpar `accountId`
- Ao mudar para qualquer outro: limpar `cardId`

### 4. Renderização condicional
- Se `paymentMethod === 'credit_card'`: mostrar seletor de Cartão (Select com cards do hook)
- Senão: mostrar seletor de Conta (como está hoje)

### 5. Submit
- Se `credit_card`: enviar `card_id: cardId, account_id: null`
- Senão: enviar `account_id: accountId, card_id: null`

## Escopo
- **1 arquivo** alterado: `TransactionForm.tsx`
- 0 novos componentes, 0 alterações em edge functions ou outros formulários

