

# Glassmorphism na Sidebar Desktop

## O que muda
Aplicar o mesmo tratamento visual da bottom nav mobile na sidebar desktop: fundo semi-transparente com blur, sombra lateral suave e bordas sutis, mantendo consistência com a identidade Finow.

## Alterações

### `src/components/navigation/Sidebar.tsx`
- Substituir `bg-sidebar border-r border-sidebar-border` por glassmorphism: `bg-sidebar/80 backdrop-blur-xl border-r border-white/10 dark:border-white/5 shadow-[4px_0_16px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_16px_rgba(0,0,0,0.2)]`
- Substituir bordas internas (header `border-b` e footer `border-t`) por versões mais sutis usando `border-sidebar-border/50` para manter a hierarquia sem cortar o efeito glass
- Botão de colapso: adicionar `backdrop-blur-sm` e fundo sutil no hover

### `src/components/navigation/NavItem.tsx`
- Refinar o item ativo: trocar `bg-sidebar-accent` por `bg-primary/10 backdrop-blur-sm` para harmonizar com o glass
- Hover state: usar `hover:bg-white/10 dark:hover:bg-white/5` para efeito glass consistente

Nenhuma outra alteração necessária. Dois arquivos modificados.

