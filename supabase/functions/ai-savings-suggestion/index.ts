import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'savings_suggestion'
const MAX_TOKENS = 200
const DAILY_AGENT_CAP = 5000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[ai-savings-suggestion] Request received`)

  // Validate cron secret
  const cronSecret = req.headers.get('x-cron-secret')
  const expectedSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    // Check agent cap
    const { data: agentUsage } = await supabaseAdmin
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('agent_name', AGENT_NAME)
      .eq('date', todayStr)

    const agentTokensToday = agentUsage?.reduce((s, u) => s + u.tokens_used, 0) || 0
    if (agentTokensToday >= DAILY_AGENT_CAP) {
      return new Response(JSON.stringify({ ok: true, skipped: 'agent_cap' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get users with consent
    const { data: usersWithConsent } = await supabaseAdmin
      .from('ai_settings')
      .select('user_id, daily_token_limit')
      .eq('allow_coach_use_transactions', true)

    if (!usersWithConsent || usersWithConsent.length === 0) {
      return new Response(JSON.stringify({ ok: true, reminders_created: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let totalReminders = 0
    let totalTokens = 0

    for (const userSetting of usersWithConsent) {
      const userId = userSetting.user_id

      // Check user token cap
      const { data: userUsage } = await supabaseAdmin
        .from('ai_token_usage')
        .select('tokens_used')
        .eq('user_id', userId)
        .eq('date', todayStr)

      const userTokens = userUsage?.reduce((s, u) => s + u.tokens_used, 0) || 0
      if (userTokens >= (userSetting.daily_token_limit || 5000)) continue

      // Check duplicate this month
      const { data: existingDup } = await supabaseAdmin
        .from('reminders')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'savings_suggestion')
        .gte('created_at', monthStart)
        .limit(1)

      if (existingDup && existingDup.length > 0) continue

      // Calculate income - expenses this month
      const { data: monthTxns } = await supabaseAdmin
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (!monthTxns || monthTxns.length === 0) continue

      const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const balance = income - expenses

      if (balance <= 0) continue

      const suggestedSavings = Math.round(balance * 0.2 * 100) / 100

      // Call AI
      const aiResp = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: 'Você é um mentor financeiro casual e motivador, PT-BR. Gere notificação sugerindo poupança. Responda APENAS JSON: { "title": "...", "message": "..." }. Título max 50 chars. Mensagem max 200 chars, casual, cite saldo disponível e valor sugerido (~20%).' },
            { role: 'user', content: `Mês positivo: receitas R$${income.toFixed(2)}, despesas R$${expenses.toFixed(2)}, saldo R$${balance.toFixed(2)}. Sugerir guardar R$${suggestedSavings.toFixed(2)} (~20%).` }
          ]
        })
      })

      let title = 'Você pode guardar dinheiro esse mês'
      let message = `Seu mês está positivo em R$${balance.toFixed(2)}. Que tal guardar R$${suggestedSavings.toFixed(2)} no seu cofrinho antes de gastar?`
      let tokens = MAX_TOKENS

      if (aiResp.ok) {
        const aiData = await aiResp.json()
        tokens = aiData.usage?.total_tokens || MAX_TOKENS
        try {
          const cleaned = (aiData.choices?.[0]?.message?.content || '').replace(/```json\n?/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(cleaned)
          if (parsed.title) title = parsed.title
          if (parsed.message) message = parsed.message
        } catch { /* fallback */ }
      }

      // End of month for expiry
      const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      await supabaseAdmin.from('reminders').insert({
        user_id: userId,
        type: 'savings_suggestion',
        title,
        message,
        data_points: [`Receitas: R$${income.toFixed(2)}`, `Despesas: R$${expenses.toFixed(2)}`, `Saldo: R$${balance.toFixed(2)}`, `Sugestão: guardar R$${suggestedSavings.toFixed(2)}`],
        related_entity_type: null,
        related_entity_id: null,
        expires_at: expiresAt.toISOString(),
      })

      // Log tokens
      await supabaseAdmin.from('ai_token_usage').insert({
        user_id: userId,
        agent_name: AGENT_NAME,
        date: todayStr,
        tokens_used: tokens,
        request_count: 1,
      })

      totalReminders++
      totalTokens += tokens
    }

    console.log(`[ai-savings-suggestion] Created ${totalReminders} reminders, ~${totalTokens} tokens`)

    return new Response(
      JSON.stringify({ ok: true, reminders_created: totalReminders, tokens_used: totalTokens }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-savings-suggestion] Error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
