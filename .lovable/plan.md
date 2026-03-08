

## Plano: Redesign dos gráficos do Dashboard

### 1. Donut Chart (Despesas por Categoria) — Maior e mais elegante

**Mudanças:**
- Aumentar o tamanho do donut: `height` de 180 → 260, `innerRadius` de 50 → 70, `outerRadius` de 78 → 105
- Label central maior e mais legível: "TOTAL" em tracking wider + valor em `text-xl font-bold`
- Adicionar `cornerRadius` no Pie para bordas arredondadas nos segmentos
- Aumentar `paddingAngle` de 3 → 4 para melhor separação visual
- Ativar animação suave (`isAnimationActive={true}`)
- Legenda: aumentar os dots de `h-2.5 w-2.5` → `h-3 w-3`, melhorar espaçamento, font-weight no valor em destaque
- Mostrar todas as categorias (remover `slice(0, 5)`) ou mostrar até 6 + "Outros"

### 2. Receitas vs Despesas — Reformulação completa

**Substituir o BarChart por um AreaChart** com gradientes, criando uma visualização mais moderna e fluida:

- Usar `AreaChart` com duas áreas sobrepostas (Receitas em verde com gradiente, Despesas em vermelho com gradiente)
- Gradientes verticais com `linearGradient` (cor sólida no topo → transparente na base)
- Linhas suaves com `type="monotone"` e `strokeWidth={2}`
- Remover a grid pesada, manter apenas linhas horizontais sutis
- Manter o header com totais de Receitas e Despesas
- Adicionar indicador visual do saldo (receita - despesa) com cor condicional
- Tooltip elegante com glassmorphism sutil
- Manter a lógica de buckets dinâmicos (dia/semana/mês) que já funciona bem

**Arquivos editados:**
1. `src/components/dashboard/ExpensesByCategoryChart.tsx` — resize + polish
2. `src/components/dashboard/IncomeVsExpensesChart.tsx` — rewrite completo para AreaChart com gradientes

