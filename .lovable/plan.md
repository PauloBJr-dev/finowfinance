

# Auditoria Mobile — Pagina de Configuracoes

## Problemas identificados

### 1. Header — NotificationCenter fora do padrao
`Configuracoes.tsx` linha 14: usa `flex justify-between` em vez do padrao `relative` + `absolute right-0 top-0` adotado em Dashboard, Transacoes, Contas a Pagar e Faturas.

### 2. BenefitDepositModal — Dialog fixo, sem Drawer no mobile
`BenefitDepositModal.tsx` usa `Dialog/DialogContent` sempre. Nao detecta `useIsMobile()` para usar `Drawer` no mobile. Falta botao X no header. Mesmo problema ja corrigido em PayBillModal e PayInvoiceModal.

### 3. BenefitDepositModal — input `type="date"` nativo
Linha 143: usa `<Input type="date">` em vez do componente `Calendar` + `Popover` padrao do Finow.

### 4. AccountList — nome + badges truncam no mobile
Linha 143-166: layout `flex justify-between` com icone + nome + badges a esquerda e saldo + menu a direita. Em telas estreitas, badges "Vale" e "Oculto" competem com o texto e o saldo, causando truncamento. O saldo deveria ir para uma segunda linha no mobile.

### 5. CardList — texto "Fecha dia X | Vence dia Y" apertado no mobile
Linha 108-113: info de ciclo do cartao + saldo + botao menu na mesma linha. Em telas < 375px, o texto do ciclo trunca ou o saldo fica comprimido.

---

## Plano de correcoes

### `src/pages/Configuracoes.tsx`
- Header: `relative` no container, `absolute right-0 top-0` no NotificationCenter, `pr-12` no titulo

### `src/components/accounts/BenefitDepositModal.tsx`
- Refatorar para Drawer no mobile (useIsMobile), Dialog no desktop
- Adicionar botao X no DrawerHeader
- Substituir `<Input type="date">` por Calendar + Popover

### `src/components/accounts/AccountList.tsx`
- Mobile: reorganizar card para empilhar info e saldo verticalmente
- Nome + badges na primeira linha, saldo + menu na segunda linha com `sm:flex-row`

### `src/components/cards/CardList.tsx`
- Mobile: empilhar nome/ciclo e saldo/menu verticalmente
- Usar `flex-col sm:flex-row` no container principal do card

