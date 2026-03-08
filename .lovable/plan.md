

## Plano: Toggle anual no Premium + check-subscription no AuthContext

### 1. Toggle mensal/anual na seção de preços (LandingPage.tsx)

- Adicionar estado `billingCycle` (`monthly` | `yearly`) no `PricingSection`
- Renderizar um toggle (usando componentes existentes `ToggleGroup`/`ToggleGroupItem`) acima dos cards de preço
- No card Premium, alternar dinamicamente:
  - Mensal: "R$ 6,90 /mês"
  - Anual: "R$ 5,83 /mês" com subtexto "R$ 70 cobrados anualmente — economize 15%"
- O botão "Assinar Premium" usa `STRIPE_PRICES.premium_monthly` ou `premium_yearly` conforme o toggle
- Remover a linha `subPrice: "ou R$ 70/ano..."` estática, já que o toggle substitui essa informação

### 2. Integrar check-subscription no AuthContext (use-auth.tsx)

- Adicionar ao `AuthContextType`:
  - `subscribed: boolean`
  - `plan: "free" | "premium" | "lifetime"`
  - `subscriptionEnd: string | null`
- Criar função interna `checkSubscription()` que invoca `supabase.functions.invoke("check-subscription")`
- Chamar `checkSubscription()`:
  - Após login/signup (dentro do `onAuthStateChange` quando `event === "SIGNED_IN"`)
  - Na carga inicial (após `getSession` se houver sessão)
  - Periodicamente a cada 60s via `setInterval` (apenas se logado)
- Mapear resposta da edge function para o state: `{ subscribed, plan, subscriptionEnd }`
- Exportar esses valores no contexto para uso em toda a app

### Arquivos modificados
- `src/pages/LandingPage.tsx` — toggle + preço dinâmico
- `src/hooks/use-auth.tsx` — subscription state + check automático

