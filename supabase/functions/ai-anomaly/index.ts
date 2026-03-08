import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'anomaly'
const MAX_TOKENS = 500
const DAILY_AGENT_CAP = 5000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[ai-anomaly] Request received`)

  try {
    // Auth via JWT (verify_jwt = true handles initial check, but we need userId)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const userId = user.id

    // Service role client for inserting reminders (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { transaction_id } = await req.json()
    if (!transaction_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no transaction_id' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check consent
    const { data: settings } = await supabaseAdmin
      .from('ai_settings')
      .select('allow_coach_use_transactions, daily_token_limit')
      .eq('user_id', userId)
      .single()

    if (!settings?.allow_coach_use_transactions) {
      console.log('[ai-anomaly] User consent disabled, skipping')
      return new Response(JSON.stringify({ ok: true, skipped: 'consent_disabled' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch the transaction
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('id, amount, type, category_id, date, description')
      .eq('id', transaction_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (!transaction || transaction.type !== 'expense' || !transaction.category_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'not_expense_or_no_category' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch historical transactions in same category (last 3 months, excluding current)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: historicalTxns } = await supabaseAdmin
      .from('transactions')
      .select('amount, date')
      .eq('user_id', userId)
      .eq('category_id', transaction.category_id)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .neq('id', transaction.id)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (!historicalTxns || historicalTxns.length < 10) {
      console.log(`[ai-anomaly] Not enough history (${historicalTxns?.length || 0} txns), skipping`)
      return new Response(JSON.stringify({ ok: true, skipped: 'insufficient_history' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Calculate average per transaction
    const avgAmount = historicalTxns.reduce((s, t) => s + Number(t.amount), 0) / historicalTxns.length

    // Calculate last month total for category
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const lastMonthTxns = historicalTxns.filter(t => {
      const d = new Date(t.date)
      return d >= lastMonthStart && d <= lastMonthEnd
    })
    const lastMonthTotal = lastMonthTxns.reduce((s, t) => s + Number(t.amount), 0)

    // Current month total (including new transaction)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const { data: thisMonthTxns } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', transaction.category_id)
      .eq('type', 'expense')
      .is('deleted_at', null)
      .gte('date', thisMonthStart.toISOString().split('T')[0])

    const thisMonthTotal = thisMonthTxns?.reduce((s, t) => s + Number(t.amount), 0) || 0

    // Check conditions
    const conditionA = Number(transaction.amount) > 2 * avgAmount
    const conditionB = lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal * 0.8

    if (!conditionA && !conditionB) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_anomaly' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'anomaly_spending')
      .eq('related_entity_id', transaction.id)
      .is('dismissed_at', null)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'duplicate' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check token budgets
    const todayStr = now.toISOString().split('T')[0]

    const { data: agentUsage } = await supabaseAdmin
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('agent_name', AGENT_NAME)
      .eq('date', todayStr)

    const agentTokensToday = agentUsage?.reduce((s, u) => s + u.tokens_used, 0) || 0
    if (agentTokensToday >= DAILY_AGENT_CAP) {
      return new Response(JSON.stringify({ ok: true, skipped: 'agent_cap' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: userUsage } = await supabaseAdmin
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .eq('date', todayStr)

    const userTokensToday = userUsage?.reduce((s, u) => s + u.tokens_used, 0) || 0
    const userLimit = settings.daily_token_limit || 5000
    if (userTokensToday >= userLimit) {
      return new Response(JSON.stringify({ ok: true, skipped: 'user_cap' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch category name
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('name')
      .eq('id', transaction.category_id)
      .single()

    const categoryName = category?.name || 'esta categoria'

    // Build data points
    const dataPoints: string[] = []
    if (conditionA) dataPoints.push(`Valor R$${Number(transaction.amount).toFixed(2)} é ${(Number(transaction.amount) / avgAmount).toFixed(1)}x a média de R$${avgAmount.toFixed(2)} na categoria ${categoryName}`)
    if (conditionB) dataPoints.push(`Total do mês R$${thisMonthTotal.toFixed(2)} já ultrapassou 80% do mês anterior (R$${lastMonthTotal.toFixed(2)}) em ${categoryName}`)

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'system',
            content: `Você é um mentor financeiro casual e amigável, em PT-BR. Gere uma notificação curta sobre gasto incomum. Responda APENAS em JSON com { "title": "...", "message": "..." }. O título deve ter no máximo 50 caracteres. A mensagem deve ter no máximo 200 caracteres, citar valores reais e ser casual.`
          },
          {
            role: 'user',
            content: `Dados da anomalia:\n${dataPoints.join('\n')}\n\nDescrição da transação: ${transaction.description || 'Sem descrição'}\nCategoria: ${categoryName}\nValor: R$${Number(transaction.amount).toFixed(2)}`
          }
        ]
      })
    })

    let title = `Gasto incomum em ${categoryName}`
    let message = dataPoints[0]
    let tokensUsed = MAX_TOKENS

    if (aiResponse.ok) {
      const aiData = await aiResponse.json()
      const content = aiData.choices?.[0]?.message?.content || ''
      tokensUsed = aiData.usage?.total_tokens || MAX_TOKENS
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.title) title = parsed.title
        if (parsed.message) message = parsed.message
      } catch {
        console.log('[ai-anomaly] Failed to parse AI response, using fallback')
      }
    }

    // Insert reminder
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await supabaseAdmin
      .from('reminders')
      .insert({
        user_id: userId,
        type: 'anomaly_spending',
        title,
        message,
        data_points: dataPoints,
        related_entity_type: 'transaction',
        related_entity_id: transaction.id,
        expires_at: expiresAt.toISOString(),
      })

    // Log token usage
    await supabaseAdmin
      .from('ai_token_usage')
      .insert({
        user_id: userId,
        agent_name: AGENT_NAME,
        date: todayStr,
        tokens_used: tokensUsed,
        request_count: 1,
      })

    console.log(`[ai-anomaly] Created anomaly reminder for user ${userId}, txn ${transaction.id}`)

    return new Response(
      JSON.stringify({ ok: true, reminder_created: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-anomaly] Error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
