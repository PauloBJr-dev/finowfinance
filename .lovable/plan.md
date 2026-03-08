

## Problema

O `NotificationCenter` (sino) está posicionado com `absolute top-3 right-4` no MainLayout, mas o header do Dashboard tem seus próprios botões (olho de privacidade + engrenagem de customização) alinhados à direita via `justify-between`. Esses dois grupos se sobrepõem no desktop e ficam desorganizados no mobile.

## Solução

Remover o `NotificationCenter` do posicionamento absoluto no MainLayout e integrá-lo diretamente na linha de botões do header do Dashboard (e das outras páginas). Isso garante que todos os botões de ação fiquem na mesma linha, com espaçamento correto.

### Alterações

**`src/components/layout/MainLayout.tsx`**
- Remover o `div` absoluto com `NotificationCenter` — ele será renderizado pelas páginas no próprio header

**`src/pages/Dashboard.tsx`**
- Adicionar `NotificationCenter` dentro do `div` de botões do header (ao lado do olho e da engrenagem), na mesma linha flex

**Outras páginas** (Transacoes, ContasPagar, Metas, Cofrinho, Configuracoes, Chat, Faturas)
- Verificar se possuem header com botões e adicionar `NotificationCenter` de forma consistente. Para páginas sem header próprio, adicionar uma linha simples com o sino alinhado à direita.

### Resultado esperado
- Desktop: sino, olho e engrenagem na mesma linha, sem sobreposição
- Mobile: mesmos botões alinhados horizontalmente no topo, sem conflito

