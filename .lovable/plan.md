

## Plano: KPI de Vale Refeição + Ícones nos KPIs do Dashboard

### 1. Adicionar ícones aos KPIs existentes

Os 3 cards atuais (Saldo Total, Despesas, Receitas) já têm ícones parciais (TrendingDown/TrendingUp nos dois últimos). Vou padronizar com ícones temáticos dentro de containers arredondados com cor de fundo sutil (mesmo padrão visual do sistema de ícones):

- **Saldo Total** → `Wallet` (azul)
- **Despesas** → `TrendingDown` (vermelho/destructive) — já existe, mas será estilizado com container
- **Receitas** → `TrendingUp` (verde/primary) — já existe, mas será estilizado com container

### 2. Novo KPI: Saldo do Vale Refeição

- Filtrar `accounts` pelo tipo `benefit_card`
- Se existir pelo menos uma conta `benefit_card`, exibir um 4º card com:
  - Ícone: `UtensilsCrossed` (laranja) em container arredondado
  - Label: "Vale Refeição"
  - Valor: soma dos `current_balance` das contas `benefit_card`
- Se não existir nenhuma conta benefit_card, o card não aparece
- Grid ajusta de `md:grid-cols-3` para `md:grid-cols-4` quando o card existe (ou mantém 3 e o 4º vai para nova linha em telas menores)

### Arquivo editado
- `src/pages/Dashboard.tsx` — adicionar lógica de benefit_card, ícones estilizados nos 4 KPIs

