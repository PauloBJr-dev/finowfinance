import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'chat'
const USER_DAILY_CAP = 5000
const MAX_MESSAGE_LENGTH = 500

function fmt(n: number): string {
  return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
      p_identifier: userId, p_endpoint: 'finow-chat', p_max_requests: 20, p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const sanitizedMessages = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role, content: String(m.content || '').slice(0, MAX_MESSAGE_LENGTH) }))

    // Check token budget
    const today = new Date().toISOString().split('T')[0]
    const { data: usageRows } = await supabase
      .from('ai_token_usage').select('tokens_used').eq('user_id', userId).eq('date', today)
    const totalUsedToday = usageRows?.reduce((s: number, r: any) => s + r.tokens_used, 0) || 0
    if (totalUsedToday >= USER_DAILY_CAP) {
      return new Response(JSON.stringify({ error: 'Limite diário de tokens atingido. Tente novamente amanhã.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch AI settings (consents + persona)
    const { data: settings } = await supabase
      .from('ai_settings').select('*').eq('user_id', userId).single()

    const consents = {
      transactions: settings?.allow_coach_use_transactions ?? true,
      invoices: settings?.allow_coach_use_invoices ?? true,
      goals: settings?.allow_coach_use_goals ?? true,
    }
    const persona = (settings?.persona_memory as Record<string, string>) || {}

    // Build financial context in parallel, respecting consents
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0]

    const dataPoints: string[] = []

    // Always fetch accounts
    const accountsPromise = supabase
      .from('accounts').select('name, type, current_balance')
      .eq('user_id', userId).is('deleted_at', null)

    // Conditionally fetch other data
    const txPromise = consents.transactions
      ? supabase.from('transactions')
          .select('amount, type, description, date, categories(name)')
          .eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd)
          .is('deleted_at', null).order('date', { ascending: false }).limit(100)
      : Promise.resolve({ data: null })

    const recent20Promise = consents.transactions
      ? supabase.from('transactions')
          .select('amount, type, description, date, categories(name)')
          .eq('user_id', userId).is('deleted_at', null)
          .order('date', { ascending: false }).limit(20)
      : Promise.resolve({ data: null })

    const billsPromise = consents.transactions
      ? supabase.from('bills')
          .select('description, amount, due_date, status')
          .eq('user_id', userId).is('deleted_at', null)
          .in('status', ['pending', 'overdue'])
          .lte('due_date', in30Days)
          .order('due_date', { ascending: true }).limit(15)
      : Promise.resolve({ data: null })

    const invoicesPromise = consents.invoices
      ? supabase.from('invoices')
          .select('total_amount, status, due_date, closing_date, cards(name, credit_limit)')
          .eq('user_id', userId).is('deleted_at', null)
          .in('status', ['open', 'closed'])
          .order('due_date', { ascending: true }).limit(10)
      : Promise.resolve({ data: null })

    const goalsPromise = consents.goals
      ? supabase.from('goals')
          .select('name, target_amount, current_amount, status, deadline')
          .eq('user_id', userId).is('deleted_at', null).eq('status', 'active')
      : Promise.resolve({ data: null })

    const piggyPromise = consents.goals
      ? supabase.from('piggy_bank')
          .select('name, balance, goal_amount')
          .eq('user_id', userId).is('deleted_at', null)
      : Promise.resolve({ data: null })

    const [accountsRes, txRes, recent20Res, billsRes, invoicesRes, goalsRes, piggyRes] = await Promise.all([
      accountsPromise, txPromise, recent20Promise, billsPromise, invoicesPromise, goalsPromise, piggyPromise
    ])

    const accounts = accountsRes.data || []
    const txs = txRes.data || []
    const recent20 = recent20Res.data || []
    const bills = billsRes.data || []
    const invoices = invoicesRes.data || []
    const goals = goalsRes.data || []
    const piggies = piggyRes.data || []

    // Build context blocks
    const contextBlocks: string[] = []

    // Accounts (always)
    const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0)
    contextBlocks.push(`CONTAS E SALDOS:
${accounts.map((a: any) => `- ${a.name} (${a.type}): ${fmt(a.current_balance)}`).join('\n') || '- Nenhuma conta cadastrada'}
- Saldo total: ${fmt(totalBalance)}`)
    dataPoints.push(`${accounts.length} conta(s) — saldo total ${fmt(totalBalance)}`)

    // Transactions (if consented)
    if (consents.transactions && txs.length > 0) {
      const totalExpenses = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
      const totalIncome = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)

      // Expenses by category
      const catMap: Record<string, number> = {}
      txs.filter((t: any) => t.type === 'expense').forEach((t: any) => {
        const cat = (t as any).categories?.name || 'Sem categoria'
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount)
      })
      const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])

      contextBlocks.push(`RESUMO DO MÊS (${monthStart} a ${monthEnd}):
- Receitas: ${fmt(totalIncome)}
- Despesas: ${fmt(totalExpenses)}
- Saldo do mês: ${fmt(totalIncome - totalExpenses)}
- Despesas por categoria:
${catSorted.map(([cat, val]) => `  • ${cat}: ${fmt(val)}`).join('\n')}`)

      dataPoints.push(`${txs.length} transações do mês — despesas ${fmt(totalExpenses)}, receitas ${fmt(totalIncome)}`)
    }

    // Recent 20 transactions
    if (consents.transactions && recent20.length > 0) {
      contextBlocks.push(`ÚLTIMAS 20 TRANSAÇÕES:
${recent20.map((t: any) => `- ${t.date} | ${t.type === 'expense' ? '-' : '+'}${fmt(t.amount)} | ${t.description || 'sem desc'} | ${(t as any).categories?.name || 'sem cat'}`).join('\n')}`)
      dataPoints.push(`Últimas ${recent20.length} transações`)
    }

    // Bills
    if (consents.transactions && bills.length > 0) {
      contextBlocks.push(`CONTAS A PAGAR (próx. 30 dias):
${bills.map((b: any) => `- ${b.description}: ${fmt(b.amount)} — vence ${b.due_date} (${b.status})`).join('\n')}`)
      dataPoints.push(`${bills.length} conta(s) a pagar`)
    }

    // Invoices
    if (consents.invoices && invoices.length > 0) {
      contextBlocks.push(`FATURAS DE CARTÃO:
${invoices.map((i: any) => {
  const card = (i as any).cards
  const limit = card?.credit_limit ? ` (limite: ${fmt(card.credit_limit)})` : ''
  return `- ${card?.name || 'Cartão'}: ${fmt(i.total_amount)}${limit} — ${i.status} — vence ${i.due_date}`
}).join('\n')}`)
      dataPoints.push(`${invoices.length} fatura(s) ativa(s)`)
    }

    // Goals
    if (consents.goals && goals.length > 0) {
      contextBlocks.push(`METAS ATIVAS:
${goals.map((g: any) => {
  const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0
  return `- ${g.name}: ${fmt(g.current_amount)} de ${fmt(g.target_amount)} (${pct}%)${g.deadline ? ` — prazo: ${g.deadline}` : ''}`
}).join('\n')}`)
      dataPoints.push(`${goals.length} meta(s) ativa(s)`)
    }

    // Piggy banks
    if (consents.goals && piggies.length > 0) {
      contextBlocks.push(`COFRINHOS:
${piggies.map((p: any) => `- ${p.name}: ${fmt(p.balance)}${p.goal_amount ? ` (objetivo: ${fmt(p.goal_amount)})` : ''}`).join('\n')}`)
      dataPoints.push(`${piggies.length} cofrinho(s)`)
    }

    // Persona config
    const tone = persona.tone || 'casual'
    const summaryLength = persona.summary_length || 'medium'

    const noDataAccess = !consents.transactions && !consents.invoices && !consents.goals

    const systemPrompt = `Você é o mentor financeiro do Finow, um app de gestão financeira pessoal para jovens (20-28 anos). Seu nome é Mentor Finow.

TOM: ${tone === 'formal' ? 'Profissional e respeitoso' : tone === 'motivational' ? 'Motivador e encorajador, com energia positiva' : 'Calmo, casual e amigável, como um amigo que entende de finanças'}
RESPOSTAS: ${summaryLength === 'short' ? 'Curtas e diretas (1-2 parágrafos)' : summaryLength === 'long' ? 'Detalhadas quando necessário (até 4 parágrafos)' : 'Concisas mas informativas (2-3 parágrafos)'}
IDIOMA: Sempre PT-BR.

REGRAS CRÍTICAS:
1. NUNCA execute, crie ou edite transações. Apenas sugira ações e instrua o usuário.
2. NUNCA dê conselhos de investimento, crédito ou seguros. Para esses temas, diga: "Esse é um assunto que vale consultar um profissional — posso ajudar a organizar suas finanças pra esse momento."
3. NUNCA invente dados. Use APENAS as informações do contexto financeiro abaixo.
4. Quando citar números, use os dados reais do contexto. Diga de onde veio o número.
5. Se o contexto está vazio ou o usuário desativou permissões, seja honesto: "Não tenho acesso aos seus dados financeiros agora. Ative as permissões em Configurações → IA para que eu possa te ajudar melhor."
6. NUNCA seja genérico quando há dados disponíveis. Referencie valores, categorias, nomes de contas.
${noDataAccess ? '\n⚠️ O USUÁRIO DESATIVOU O ACESSO AOS DADOS FINANCEIROS. Responda de forma genérica e sugira ativar as permissões.' : ''}

${contextBlocks.length > 0 ? `CONTEXTO FINANCEIRO ATUAL DO USUÁRIO:\n\n${contextBlocks.join('\n\n')}` : 'NENHUM DADO FINANCEIRO DISPONÍVEL (permissões desativadas ou sem dados cadastrados).'}`

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...sanitizedMessages],
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

    // Record token usage
    const estimatedTokens = 300
    const { data: existingUsage } = await supabase
      .from('ai_token_usage').select('id, tokens_used, request_count')
      .eq('user_id', userId).eq('agent_name', AGENT_NAME).eq('date', today).single()

    if (existingUsage) {
      await supabase.from('ai_token_usage').update({
        tokens_used: existingUsage.tokens_used + estimatedTokens,
        request_count: existingUsage.request_count + 1,
      }).eq('id', existingUsage.id)
    } else {
      await supabase.from('ai_token_usage').insert({
        user_id: userId, agent_name: AGENT_NAME, tokens_used: estimatedTokens, request_count: 1, date: today,
      })
    }

    // Create a TransformStream to append data_points meta event after the AI stream
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const reader = aiResponse.body!.getReader()

    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(value)
        }
        // Append meta event with data_points
        const metaEvent = `data: ${JSON.stringify({ meta: { data_points: dataPoints } })}\n\n`
        await writer.write(new TextEncoder().encode(metaEvent))
      } catch (e) {
        console.error('[finow-chat] Stream error:', e)
      } finally {
        await writer.close()
      }
    })()

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })

  } catch (error) {
    console.error('[finow-chat] Internal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
