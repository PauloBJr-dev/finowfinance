

# Auditoria: Loading lento entre telas + Card de notificações transparente

## 1. Loading lento entre telas

### Causa raiz
Todas as páginas usam `React.lazy()` com um `Suspense` fallback que mostra um spinner de tela cheia. A cada navegação, o chunk JS da página é baixado sob demanda — sem prefetch. O usuário vê o spinner até o chunk carregar + renderizar.

Agravantes:
- **LandingPage.tsx** tem 958 linhas num único arquivo — chunk pesado
- Não há **prefetch** dos chunks de rotas adjacentes
- O fallback é um spinner genérico de tela inteira — sensação de lentidão

### Correções propostas

**A. Prefetch de rotas no hover/idle** (`src/App.tsx`)
- Criar um componente `RoutePrefetcher` que importa os chunks das rotas principais durante idle time (`requestIdleCallback`) logo após o primeiro render
- Isso garante que ao navegar, o chunk já está em cache

**B. Skeleton como fallback em vez de spinner** (`src/App.tsx`)
- Substituir o `PageLoader` (spinner genérico) por um skeleton layout que imita a estrutura da página (sidebar + content area)
- Reduz a percepção de lentidão — o usuário vê um layout parcial em vez de tela vazia + spinner

**C. Prefetch on hover nos links de navegação** (`src/components/navigation/NavLink.tsx`)
- Nos links da sidebar e bottom nav, ao `onMouseEnter`/`onTouchStart`, disparar o `import()` do chunk correspondente
- Assim quando o usuário clica, o módulo já está carregado

### Arquivos
- `src/App.tsx` — prefetch idle + skeleton fallback
- `src/components/navigation/NavLink.tsx` ou `NavItem.tsx` — prefetch on hover

---

## 2. Card de notificações transparente / ilegível

### Diagnóstico
O componente `NotificationCenter` usa `SheetContent` que herda `bg-background` — cor sólida. Não há classe `glass`, `backdrop-blur` ou transparência aplicada.

No entanto, o `SheetContent` no `sheet.tsx` (linha 32) tem a classe base: `bg-background p-6 shadow-lg` — que é opaca. O `NotificationCenter` passa `className="w-full sm:max-w-md p-0 flex flex-col"` sem sobrescrever o background.

**Possível causa:** O Sheet default não especifica `bg-background` explicitamente na variant — ele usa a classe base que inclui `bg-background`. Mas se algum tema ou plugin CSS estiver interferindo, pode ficar transparente. 

### Correção
- Adicionar `bg-background` explicitamente no `SheetContent` do `NotificationCenter` para garantir opacidade total
- Adicionar `border-l border-border` para reforçar a separação visual

### Arquivo
- `src/components/notifications/NotificationCenter.tsx` — linha 144, adicionar classes explícitas de background

---

## Resumo técnico

| Problema | Causa | Solução |
|----------|-------|---------|
| Loading lento | Chunks carregados sob demanda sem prefetch | Prefetch idle + hover + skeleton fallback |
| Notificações transparentes | Background implícito pode ser overridden | `bg-background` explícito no SheetContent |

### Arquivos a modificar
- `src/App.tsx`
- `src/components/navigation/NavLink.tsx` ou `NavItem.tsx`
- `src/components/notifications/NotificationCenter.tsx`

