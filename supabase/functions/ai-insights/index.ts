import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'insights'
const AGENT_DAILY_CAP = 20000
const USER_DAILY_CAP = 5000

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

    // Auth
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

    // Rate limiting: 30 req/min
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId,
      p_endpoint: 'ai-insights',
      p_max_requests: 30,
      p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse body
    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate e endDate são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check token budget
    const today = new Date().toISOString().split('T')[0]
    const { data: usageRows } = await supabase
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .eq('date', today)

    const totalUsedToday = usageRows?.reduce((s: number, r: any) => s + r.tokens_used, 0) || 0
    if (totalUsedToday >= USER_DAILY_CAP) {
      return new Response(JSON.stringify({ error: 'Limite diário de tokens atingido. Tente novamente amanhã.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch transactions with categories
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, type, date, description, payment_method, category_id, categories(name, icon)')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(500)

    if (txError) {
      console.error('[ai-insights] Error fetching transactions:', txError)
      return new Response(JSON.stringify({ error: 'Erro ao buscar transações' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({
        summary: 'Não há transações no período selecionado para analisar.',
        highlights: [],
        warnings: [],
        tips: ['Comece registrando suas despesas e receitas para receber insights personalizados.'],
        data_points: ['0 transações no período']
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Aggregate data for prompt
    const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const balance = totalIncome - totalExpenses

    const categoryMap: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === 'expense') {
        const catName = (t as any).categories?.name || 'Sem categoria'
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(t.amount)
      }
    }
    const categorySorted = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])

    const contextText = `
Período: ${startDate} a ${endDate}
Total de transações: ${transactions.length}
Receitas: R$ ${totalIncome.toFixed(2)}
Despesas: R$ ${totalExpenses.toFixed(2)}
Balanço: R$ ${balance.toFixed(2)}

Despesas por categoria (top 10):
${categorySorted.slice(0, 10).map(([cat, val]) => `- ${cat}: R$ ${val.toFixed(2)} (${((val / totalExpenses) * 100).toFixed(1)}%)`).join('\n')}

Número de transações: ${transactions.length}
`.trim()

    // Call Lovable AI Gateway with tool calling
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um analista financeiro pessoal do app Finow. Fale em PT-BR, tom casual e calmo. Analise os dados financeiros do usuário e retorne insights estruturados usando a ferramenta fornecida. Não dê conselhos de investimento ou seguros — para isso, recomende um profissional. Seja direto e útil.`
          },
          {
            role: 'user',
            content: `Analise meus dados financeiros deste período e gere insights:\n\n${contextText}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'financial_insights',
              description: 'Retorna insights financeiros estruturados',
              parameters: {
                type: 'object',
                properties: {
                  summary: { type: 'string', description: 'Resumo geral de 1-2 frases sobre a saúde financeira do período' },
                  highlights: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de 2-4 destaques positivos ou neutros'
                  },
                  warnings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de 0-3 alertas sobre gastos preocupantes ou tendências negativas'
                  },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de 1-3 dicas práticas e acionáveis'
                  }
                },
                required: ['summary', 'highlights', 'warnings', 'tips'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'financial_insights' } }
      })
    })

    if (!aiResponse.ok) {
      const status = aiResponse.status
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.error('[ai-insights] Gateway error:', status, await aiResponse.text())
      return new Response(JSON.stringify({ error: 'Erro ao gerar insights' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiData = await aiResponse.json()
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    const estimatedTokens = (aiData.usage?.total_tokens) || 800

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

    // Parse tool call result
    let insights
    try {
      insights = JSON.parse(toolCall?.function?.arguments || '{}')
    } catch {
      insights = {
        summary: 'Não foi possível gerar insights detalhados.',
        highlights: [],
        warnings: [],
        tips: ['Tente novamente mais tarde.']
      }
    }

    return new Response(JSON.stringify({
      ...insights,
      data_points: [
        `${transactions.length} transações analisadas`,
        `Período: ${startDate} a ${endDate}`,
        `Receitas: R$ ${totalIncome.toFixed(2)}`,
        `Despesas: R$ ${totalExpenses.toFixed(2)}`,
      ]
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[ai-insights] Internal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
