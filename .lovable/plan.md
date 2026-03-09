

# Correção: Valores truncados nos Summary Cards (Contas a Pagar)

## Problema
No mobile (375px), os 3 summary cards em `grid-cols-3` com ícone circular `h-8 w-8` + texto ficam com apenas ~110px cada. O ícone `shrink-0` consome ~40px, sobrando ~50px para o texto — insuficiente para valores como "R$ 385,30", que ficam truncados como "R$ ...".

## Solução
Mudar o layout dos summary cards no mobile para **empilhar ícone e texto verticalmente** (centralizado), removendo a disposição horizontal que não cabe. No desktop, manter horizontal.

### Arquivo: `src/pages/ContasPagar.tsx`
- Cards mobile: layout vertical (`flex-col items-center text-center`) — ícone em cima, label e valor embaixo
- Cards desktop (`sm:`): manter horizontal como está
- Remover `truncate` do valor (não precisa truncar em layout vertical)
- Reduzir ícone para `h-7 w-7` no mobile

