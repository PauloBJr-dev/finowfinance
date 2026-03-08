import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'reporting'
const USER_DAILY_CAP = 5000
const REPORT_TOKEN_CAP = 1600

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = user.id

    // Rate limiting
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId, p_endpoint: 'reports-preview', p_max_requests: 5, p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate e endDate são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ---- Fetch all data in parallel ----
    const today = new Date().toISOString().split('T')[0]
    const endDateObj = new Date(endDate + 'T12:00:00')
    const sixMonthsAgo = new Date(endDateObj)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

    // Previous month range for comparison
    const startDateObj = new Date(startDate + 'T12:00:00')
    const prevMonthEnd = new Date(startDateObj)
    prevMonthEnd.setDate(prevMonthEnd.getDate() - 1)
    const prevMonthStart = new Date(prevMonthEnd)
    prevMonthStart.setDate(1)
    const prevStartStr = prevMonthStart.toISOString().split('T')[0]
    const prevEndStr = prevMonthEnd.toISOString().split('T')[0]

    const [
      { data: currentTx },
      { data: historicalTx },
      { data: prevTx },
      { data: goals },
      { data: piggyBanks },
      { data: aiSettings },
      { data: usageRows },
      { data: anomalyReminders },
    ] = await Promise.all([
      // Current period transactions
      supabase.from('transactions')
        .select('amount, type, date, category_id, categories(name)')
        .eq('user_id', userId).is('deleted_at', null)
        .gte('date', startDate).lte('date', endDate)
        .order('date', { ascending: true }).limit(1000),
      // Last 6 months transactions
      supabase.from('transactions')
        .select('amount, type, date, category_id, categories(name)')
        .eq('user_id', userId).is('deleted_at', null)
        .gte('date', sixMonthsAgoStr).lte('date', endDate)
        .order('date', { ascending: true }).limit(1000),
      // Previous month transactions
      supabase.from('transactions')
        .select('amount, type')
        .eq('user_id', userId).is('deleted_at', null)
        .gte('date', prevStartStr).lte('date', prevEndStr).limit(1000),
      // Active goals
      supabase.from('goals')
        .select('name, target_amount, current_amount, status, deadline')
        .eq('user_id', userId).eq('status', 'active').is('deleted_at', null),
      // Piggy banks
      supabase.from('piggy_bank')
        .select('name, balance')
        .eq('user_id', userId).is('deleted_at', null),
      // AI settings
      supabase.from('ai_settings')
        .select('allow_coach_use_transactions, allow_coach_use_goals, daily_token_limit')
        .eq('user_id', userId).single(),
      // Token usage today
      supabase.from('ai_token_usage')
        .select('tokens_used')
        .eq('user_id', userId).eq('date', today),
      // Anomaly reminders in period
      supabase.from('reminders')
        .select('id')
        .eq('user_id', userId).eq('type', 'anomaly_spending')
        .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59').limit(10),
    ])

    // ---- Aggregate current period ----
    let totalIncome = 0, totalExpenses = 0
    const expensesByCategory: Record<string, number> = {}
    const incomeByCategory: Record<string, number> = {}

    for (const tx of (currentTx || [])) {
      const amt = Number(tx.amount)
      const catName = (tx.categories as any)?.name || 'Sem categoria'
      if (tx.type === 'expense') {
        totalExpenses += amt
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amt
      } else {
        totalIncome += amt
        incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amt
      }
    }
    const balance = totalIncome - totalExpenses

    const expCatSorted = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])
    const incCatSorted = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1])

    // Previous month totals
    let prevIncome = 0, prevExpenses = 0
    for (const tx of (prevTx || [])) {
      if (tx.type === 'expense') prevExpenses += Number(tx.amount)
      else prevIncome += Number(tx.amount)
    }

    // ---- Historical months (last 6) ----
    const monthlyData: Record<string, { expenses: number; income: number; categoryCounts: Record<string, number> }> = {}
    for (const tx of (historicalTx || [])) {
      const monthKey = tx.date.substring(0, 7) // YYYY-MM
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { expenses: 0, income: 0, categoryCounts: {} }
      const amt = Number(tx.amount)
      const catName = (tx.categories as any)?.name || 'Sem categoria'
      if (tx.type === 'expense') {
        monthlyData[monthKey].expenses += amt
        monthlyData[monthKey].categoryCounts[catName] = (monthlyData[monthKey].categoryCounts[catName] || 0) + amt
      } else {
        monthlyData[monthKey].income += amt
      }
    }

    const historicalMonths = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => {
        const topCat = Object.entries(data.categoryCounts).sort((a, b) => b[1] - a[1])[0]
        return {
          month: getMonthLabel(month + '-15'),
          monthKey: month,
          expenses: Math.round(data.expenses * 100) / 100,
          income: Math.round(data.income * 100) / 100,
          topCategory: topCat ? topCat[0] : '-',
        }
      })

    // ---- Projection (average of last 3 months) ----
    const last3 = historicalMonths.slice(-3)
    const avgExpenses = last3.length > 0 ? last3.reduce((s, m) => s + m.expenses, 0) / last3.length : 0
    const avgIncome = last3.length > 0 ? last3.reduce((s, m) => s + m.income, 0) / last3.length : 0
    const projection = {
      estimatedExpenses: Math.round(avgExpenses * 100) / 100,
      estimatedIncome: Math.round(avgIncome * 100) / 100,
      projectedBalance: Math.round((avgIncome - avgExpenses) * 100) / 100,
    }

    // ---- Health Score (0-100) ----
    const hasActiveGoalWithProgress = (goals || []).some((g: any) => g.current_amount > 0)
    const hasPiggyWithBalance = (piggyBanks || []).some((p: any) => p.balance > 0)
    const noAnomalies = !(anomalyReminders && anomalyReminders.length > 0)
    const incomeGrew = prevIncome > 0 ? totalIncome > prevIncome : false

    const scoreCriteria = [
      { name: 'Saldo positivo no mês', met: balance > 0, points: 25 },
      { name: 'Meta ativa com progresso', met: hasActiveGoalWithProgress, points: 20 },
      { name: 'Gastos menores que receitas', met: totalExpenses < totalIncome, points: 20 },
      { name: 'Sem anomalias de gasto', met: noAnomalies, points: 15 },
      { name: 'Cofrinho com saldo', met: hasPiggyWithBalance, points: 10 },
      { name: 'Receitas cresceram vs mês anterior', met: incomeGrew, points: 10 },
    ]
    const scoreValue = scoreCriteria.reduce((s, c) => s + (c.met ? c.points : 0), 0)
    const scoreLevel = scoreValue >= 80 ? 'excellent' : scoreValue >= 60 ? 'good' : scoreValue >= 40 ? 'attention' : 'critical'

    const score = { value: scoreValue, level: scoreLevel, criteria: scoreCriteria }

    // ---- AI sections ----
    const settings = aiSettings || { allow_coach_use_transactions: true, allow_coach_use_goals: true, daily_token_limit: USER_DAILY_CAP }
    const totalUsedToday = (usageRows || []).reduce((s: number, r: any) => s + r.tokens_used, 0)
    const userCap = settings.daily_token_limit || USER_DAILY_CAP
    const tokenBudgetExceeded = totalUsedToday + REPORT_TOKEN_CAP > userCap

    let ai: any = {
      narrative: null,
      historicalObservation: null,
      projectionInterpretation: null,
      scoreAnalysis: null,
      unavailable: false,
      unavailableReason: null,
    }

    const canUseTransactions = settings.allow_coach_use_transactions
    const canUseGoals = settings.allow_coach_use_goals

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (tokenBudgetExceeded) {
      ai.unavailable = true
      ai.unavailableReason = 'token_limit'
    } else if (!LOVABLE_API_KEY) {
      ai.unavailable = true
      ai.unavailableReason = 'not_configured'
    } else {
      // Build context for AI
      const expVariation = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) : 'N/A'
      const incVariation = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : 'N/A'

      const goalsContext = canUseGoals && goals && goals.length > 0
        ? `\nMetas ativas:\n${goals.map((g: any) => `- ${g.name}: ${formatBRL(g.current_amount)} de ${formatBRL(g.target_amount)} (${Math.round(g.current_amount / g.target_amount * 100)}%)${g.deadline ? ` — prazo: ${g.deadline}` : ''}`).join('\n')}`
        : ''

      const piggyContext = piggyBanks && piggyBanks.length > 0
        ? `\nCofrinhos: ${piggyBanks.map((p: any) => `${p.name}: ${formatBRL(p.balance)}`).join(', ')}`
        : ''

      const transactionsContext = canUseTransactions
        ? `
Período: ${startDate} a ${endDate}
Receitas: ${formatBRL(totalIncome)} | Despesas: ${formatBRL(totalExpenses)} | Saldo: ${formatBRL(balance)}
Variação despesas vs mês anterior: ${expVariation}%
Variação receitas vs mês anterior: ${incVariation}%
Top 3 categorias de gasto: ${expCatSorted.slice(0, 3).map(([cat, val]) => `${cat} (${formatBRL(val)})`).join(', ')}
${goalsContext}${piggyContext}

Histórico mensal (últimos 6 meses):
${historicalMonths.map(m => `${m.month}: despesas ${formatBRL(m.expenses)}, receitas ${formatBRL(m.income)}, top: ${m.topCategory}`).join('\n')}

Projeção próximo mês: despesas ${formatBRL(projection.estimatedExpenses)}, receitas ${formatBRL(projection.estimatedIncome)}, saldo ${formatBRL(projection.projectedBalance)}
Score de saúde: ${scoreValue}/100 (${scoreLevel})
Critérios atendidos: ${scoreCriteria.filter(c => c.met).map(c => c.name).join(', ')}
Critérios não atendidos: ${scoreCriteria.filter(c => !c.met).map(c => c.name).join(', ')}
`
        : 'Dados de transações não compartilhados pelo usuário.'

      const systemPrompt = `Você é o Mentor Financeiro do app Finow. Gere análises em PT-BR, tom casual e de mentor calmo.

REGRAS OBRIGATÓRIAS:
- Nunca invente valores, datas ou instituições financeiras
- Use APENAS os dados fornecidos no contexto
- Se um dado não estiver disponível, omita essa informação
- Não forneça conselhos de investimento, crédito ou seguros. Se necessário, recomende um profissional licenciado.
- Cite os números reais do usuário nas análises`

      const userPrompt = `Com base nos dados financeiros abaixo, gere as 4 seções do relatório personalizado:\n\n${transactionsContext}`

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'generate_report_sections',
                  description: 'Gera as 4 seções do relatório financeiro personalizado',
                  parameters: {
                    type: 'object',
                    properties: {
                      narrative: {
                        type: 'string',
                        description: 'Parágrafo de 4-6 linhas resumindo o mês financeiro do usuário, em tom de mentor casual. Cite números reais.'
                      },
                      historical_observation: {
                        type: 'string',
                        description: '2-3 linhas de observação sobre a tendência dos últimos 6 meses. Cite categorias e variações.'
                      },
                      projection_interpretation: {
                        type: 'string',
                        description: '3-4 linhas interpretando a projeção. Tom de alerta se negativa, encorajador se positiva.'
                      },
                      score_strengths: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2 pontos fortes do usuário (o que está fazendo bem)'
                      },
                      score_improvements: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '2 pontos de melhoria (o que precisa de atenção)'
                      },
                      score_motivation: {
                        type: 'string',
                        description: '1 frase motivacional personalizada baseada no score e nos dados'
                      },
                    },
                    required: ['narrative', 'historical_observation', 'projection_interpretation', 'score_strengths', 'score_improvements', 'score_motivation'],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: 'function', function: { name: 'generate_report_sections' } },
          }),
        })

        if (!aiResponse.ok) {
          const status = aiResponse.status
          if (status === 429) {
            ai.unavailable = true
            ai.unavailableReason = 'rate_limit'
          } else if (status === 402) {
            ai.unavailable = true
            ai.unavailableReason = 'credits_exhausted'
          } else {
            console.error('[reports-preview] AI Gateway error:', status)
            ai.unavailable = true
            ai.unavailableReason = 'ai_error'
          }
        } else {
          const aiResult = await aiResponse.json()
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0]
          const estimatedTokens = aiResult.usage?.total_tokens || REPORT_TOKEN_CAP

          // Record token usage
          const { data: existingUsage } = await supabase
            .from('ai_token_usage')
            .select('id, tokens_used, request_count')
            .eq('user_id', userId)
            .eq('agent_name', AGENT_NAME)
            .eq('date', today)
            .single()

          if (existingUsage) {
            await supabase.from('ai_token_usage').update({
              tokens_used: existingUsage.tokens_used + estimatedTokens,
              request_count: existingUsage.request_count + 1,
            }).eq('id', existingUsage.id)
          } else {
            await supabase.from('ai_token_usage').insert({
              user_id: userId,
              agent_name: AGENT_NAME,
              tokens_used: estimatedTokens,
              request_count: 1,
              date: today,
            })
          }

          try {
            const parsed = JSON.parse(toolCall?.function?.arguments || '{}')
            if (canUseTransactions) {
              ai.narrative = parsed.narrative || null
              ai.historicalObservation = parsed.historical_observation || null
              ai.projectionInterpretation = parsed.projection_interpretation || null
            }
            ai.scoreAnalysis = {
              strengths: parsed.score_strengths || [],
              improvements: parsed.score_improvements || [],
              motivation: parsed.score_motivation || '',
            }
          } catch {
            ai.unavailable = true
            ai.unavailableReason = 'parse_error'
          }
        }
      } catch (e) {
        console.error('[reports-preview] AI call failed:', e)
        ai.unavailable = true
        ai.unavailableReason = 'ai_error'
      }
    }

    // If transactions consent is off, clear transaction-dependent sections
    if (!canUseTransactions) {
      ai.narrative = null
      ai.historicalObservation = null
      ai.projectionInterpretation = null
    }

    return new Response(JSON.stringify({
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      },
      previousMonth: {
        totalIncome: Math.round(prevIncome * 100) / 100,
        totalExpenses: Math.round(prevExpenses * 100) / 100,
      },
      expensesByCategory: expCatSorted.map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 })),
      incomeByCategory: incCatSorted.map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 })),
      historicalMonths,
      projection,
      score,
      ai,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[reports-preview] Internal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
