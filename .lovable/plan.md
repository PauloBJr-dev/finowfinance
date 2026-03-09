

# Melhorar animações mobile — mais suaves, cara do Finow

## Diagnóstico

O projeto usa poucas animações customizadas no fluxo principal mobile. Os pontos que impactam a experiência:

1. **FAB (FloatingActionButton)** — `animate-scale-in` com 0.2s `ease-out` aparece de forma abrupta
2. **Transições de página** — sem nenhuma animação; o conteúdo simplesmente "aparece" ao trocar de rota (via lazy loading Suspense)
3. **Keyframes globais** — `fade-up` desloca 10px (pouco), `scale-in` parte de 0.95 (ok), mas os timings são curtos e com `ease-out` puro, sem a suavidade que curvas cubic-bezier oferecem
4. **Listas (transações, contas)** — itens carregam todos de uma vez, sem stagger ou entrada gradual

## Alterações propostas

### 1. Refinar keyframes e timings no `tailwind.config.ts`
- Trocar `ease-out` por `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out suave, estilo iOS) em todas as animações
- Aumentar duração de `fade-in` (0.3s → 0.4s), `fade-up` (0.4s → 0.5s), `scale-in` (0.2s → 0.35s)
- Reduzir deslocamento do `fade-up` de 10px para 6px (mais sutil)
- Reduzir escala inicial do `scale-in` de 0.95 para 0.97 (mais sutil)

### 2. Adicionar animação de entrada nas páginas (`MainLayout.tsx`)
- Adicionar `animate-fade-in` ao container de conteúdo para que toda troca de rota tenha uma entrada suave

### 3. Suavizar o FAB (`FloatingActionButton.tsx`)
- Trocar `animate-scale-in` por `animate-fade-up` (mais orgânico)
- Reduzir hover scale de 1.10 para 1.05

### 4. Adicionar CSS para stagger de lista (`index.css`)
- Utility class `.stagger-list > *` com `animation-delay` incremental via `calc()` e `--i` para entrada sequencial dos itens

### 5. Aplicar stagger nas listas de transações (`TransactionList.tsx`)
- Envolver grupo de itens com `stagger-list` class e aplicar `animate-fade-up` em cada item com CSS custom property `--i` para delay

## Sem impacto em
- Nenhuma Edge Function, tabela, lógica de dados ou componente UI de terceiros (shadcn)
- LandingPage (mantém suas animações próprias de scroll)

