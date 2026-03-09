

# Melhorias no Dashboard Mobile

## Problemas identificados (pela screenshot e pelo codigo)

1. **Header de saudacao**: O greeting + badge Lifetime + icones de acao estao todos numa unica linha `flex justify-between`, causando crowding no mobile. O badge "Lifetime" fica deslocado e feio.
2. **Icones de acao (notificacao, privacidade, customizer)**: Mal posicionados, competem com o texto da saudacao.
3. **Badge de plano**: Nao precisa estar no header mobile — ocupa espaco sem valor.
4. **Period Filter**: Pills em `flex-wrap` ficam "esquisitas" no mobile — sem scroll horizontal, quebram em multiplas linhas de forma desorganizada.

## Solucao

### 1. Header mobile redesenhado
- **Mobile**: Layout vertical. Saudacao em destaque (texto grande, sem badge de plano). Icones de acao (notificacao, privacidade, customizer) alinhados no canto superior direito em linha compacta.
- **Desktop**: Manter layout atual horizontal.
- Badge de plano: esconder no mobile (`hidden md:inline-flex`), manter no desktop.

### 2. Period Filter mobile
- No mobile: scroll horizontal (`overflow-x-auto`) com `flex-nowrap` e `scrollbar-hide`, sem quebra de linha. Pills menores e mais compactas.
- No desktop: manter `flex-wrap` atual.

### Arquivos modificados

1. **`src/pages/Dashboard.tsx`** (linhas 280-324)
   - Reestruturar header: no mobile, saudacao ocupa linha inteira, icones ficam acima a direita
   - Badge de plano com `hidden md:inline-flex`
   - Subtitulo mais curto no mobile

2. **`src/components/shared/PeriodFilter.tsx`**
   - Container: `overflow-x-auto scrollbar-hide flex-nowrap` no mobile
   - Manter `flex-wrap` no desktop

3. **`src/index.css`**
   - Adicionar classe utilitaria `scrollbar-hide` se nao existir

