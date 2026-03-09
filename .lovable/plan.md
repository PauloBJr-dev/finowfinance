

# Auditoria Mobile — Pagina de Chat

## Problemas identificados

### 1. Header — NotificationCenter fora do padrao
Linha 122: usa `flex justify-between` com NotificationCenter e botao Limpar a direita. Nao segue o padrao `relative` + `absolute right-0 top-0` adotado em todas as outras paginas ja corrigidas.

### 2. Altura do chat conflita com MainLayout
O chat usa `h-[calc(100vh-8rem)]` no mobile, mas esta dentro do `container py-6` do MainLayout (linhas 33-35). O `py-6` (24px top + 24px bottom) + `pb-24` (96px bottom nav space) nao sao contabilizados corretamente no calc. Resultado: o input bar pode ficar parcialmente coberto pela BottomNav ou haver espaco desperdicado.

### 3. Textarea usa min-h base de 80px do componente
O componente `Textarea` tem `min-h-[80px]` no CSS base. O chat sobrescreve com `min-h-[44px]`, mas a classe base pode ter precedencia dependendo da ordem de merge. Deveria forcar altura minima correta.

### 4. Input bar sem safe-area-inset no mobile
A barra de input (`border-t px-4 py-3`) nao tem `pb-safe` para dispositivos com barra de gestos (iPhone). O conteudo pode ficar atras da home indicator.

---

## Plano de correcoes

### `src/pages/Chat.tsx`

**Header:** Refatorar para `relative` container. Titulo + icone mentor com `pr-20`. NotificationCenter e botao Limpar dentro de `absolute right-0 top-0 flex gap-1`.

**Altura:** Ajustar calc para considerar o padding do MainLayout:
- Mobile: `h-[calc(100vh-8rem-3rem)]` (8rem = bottom nav + safe, 3rem = container py-6)
- Ou melhor: usar `flex-1` e deixar o flexbox do MainLayout controlar, removendo height fixo

**Input bar:** Adicionar `pb-safe` ao container do input para safe area em iPhones.

**Textarea:** Garantir que `min-h-[44px]` vence usando `!min-h-[44px]` ou inline style.

