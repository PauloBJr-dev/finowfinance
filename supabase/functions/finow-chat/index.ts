import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'chat'
const USER_DAILY_CAP = 5000
const MAX_MESSAGE_LENGTH = 500

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
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

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = claims.claims.sub as string

    // Parse and sanitize body
    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sanitize messages
    const sanitizedMessages = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({
        role: m.role,
        content: String(m.content || '').slice(0, MAX_MESSAGE_LENGTH)
      }))

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

    // Fetch financial context
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [txResult, accountsResult, billsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, type, description, date, categories(name)')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('accounts')
        .select('name, type, current_balance')
        .eq('user_id', userId)
        .is('deleted_at', null),
      supabase
        .from('bills')
        .select('description, amount, due_date, status')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(10)
    ])

    const txs = txResult.data || []
    const accounts = accountsResult.data || []
    const bills = billsResult.data || []

    const totalExpenses = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalIncome = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0)

    const financialContext = `
CONTEXTO FINANCEIRO ATUAL DO USUÁRIO (use para personalizar suas respostas):
- Mês atual: ${monthStart} a ${monthEnd}
- Receitas do mês: R$ ${totalIncome.toFixed(2)}
- Despesas do mês: R$ ${totalExpenses.toFixed(2)}
- Saldo total em contas: R$ ${totalBalance.toFixed(2)}
- Contas: ${accounts.map((a: any) => `${a.name} (${a.type}): R$ ${Number(a.current_balance).toFixed(2)}`).join('; ') || 'nenhuma'}
- Contas a pagar pendentes: ${bills.map((b: any) => `${b.description}: R$ ${Number(b.amount).toFixed(2)} vence ${b.due_date}`).join('; ') || 'nenhuma'}
- Transações recentes: ${txs.slice(0, 15).map((t: any) => `${t.type === 'expense' ? '-' : '+'}R$ ${Number(t.amount).toFixed(2)} ${t.description || ''} (${(t as any).categories?.name || 'sem cat'})`).join('; ') || 'nenhuma'}
`.trim()

    const systemPrompt = `Você é o mentor financeiro do Finow, um app de finanças pessoais. Seu tom é calmo, casual e encorajador, como um amigo que entende de finanças. Fale sempre em PT-BR.

REGRAS IMPORTANTES:
1. NUNCA execute, crie ou edite transações. Você pode sugerir ações e instruir o usuário como fazer.
2. NUNCA dê conselhos de investimento, crédito ou seguros. Para esses temas, recomende buscar um profissional licenciado.
3. NUNCA invente dados — use apenas as informações do contexto financeiro abaixo.
4. Seja conciso (máximo 3 parágrafos por resposta).
5. Quando citar números, use os dados reais do contexto.

${financialContext}`

    // Call Lovable AI Gateway with streaming
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
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages,
        ],
        stream: true,
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
      console.error('[finow-chat] Gateway error:', status)
      return new Response(JSON.stringify({ error: 'Erro ao conectar com IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Record estimated token usage (we can't know exact until stream ends, estimate ~300)
    const estimatedTokens = 300
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

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })

  } catch (error) {
    console.error('[finow-chat] Internal error:', error)
    const corsHeaders = getCorsHeaders(req)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
