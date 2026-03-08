

## Plano: Melhorar FAB e corrigir bugs de layout mobile

### Problemas identificados

1. **FAB no mobile**: posicionado com `bottom-20` e `left-1/2 -translate-x-1/2`, ficando sobreposto à BottomNav e potencialmente cortado. A animação é apenas `hover:scale-105 active:scale-95` — sem entrada suave nem feedback visual rico.

2. **FAB no desktop**: posicionado `bottom-8 right-8` com classes duplicadas (`bottom-8 right-8` aparece duas vezes). Animação básica sem transição de entrada.

3. **BottomNav z-index**: `z-40` enquanto FAB é `z-50` — correto, mas o FAB centralizado no mobile pode cobrir itens de nav.

4. **Layout mobile**: `pb-20` no main pode não ser suficiente dependendo do conteúdo + safe area.

### Correções planejadas

**`src/components/navigation/FloatingActionButton.tsx`**:
- Mobile: reposicionar o FAB à **direita** da BottomNav (`right-4 bottom-[4.5rem]`) em vez de centralizado, evitando sobreposição com itens de navegação
- Desktop: manter `bottom-8 right-8`, remover classes duplicadas
- Adicionar animação de entrada suave (`animate-scale-in`) e sombra com cor primária (`shadow-primary/25`)
- Melhorar hover/active: transição mais fluida com `duration-300`, efeito de sombra elevada no hover
- Adicionar `will-change-transform` para performance

**`src/components/navigation/BottomNav.tsx`**:
- Verificar `pb-safe` (safe area) está aplicado corretamente

**`src/components/layout/MainLayout.tsx`**:
- Ajustar `pb-20` para `pb-24` no mobile para garantir espaço suficiente com FAB reposicionado

### Arquivos editados
- `src/components/navigation/FloatingActionButton.tsx`
- `src/components/layout/MainLayout.tsx`

