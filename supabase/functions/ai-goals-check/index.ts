import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'goals_check'
const MAX_TOKENS = 300
const DAILY_AGENT_CAP = 5000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[ai-goals-check] Request received`)

  // Validate cron secret
  const cronSecret = req.headers.get('x-cron-secret')
  const expectedSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    console.log('[ai-goals-check] Unauthorized: invalid cron secret')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

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

    // Get users with goals consent
    const { data: usersWithConsent } = await supabaseAdmin
      .from('ai_settings')
      .select('user_id, daily_token_limit')
      .eq('allow_coach_use_goals', true)

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
      const userLimit = userSetting.daily_token_limit || 5000
      if (userTokens >= userLimit) continue

      // Fetch active goals
      const { data: goals } = await supabaseAdmin
        .from('goals')
        .select('id, name, target_amount, current_amount, deadline, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (!goals || goals.length === 0) continue

      let userTokensUsed = 0
      let userReminders = 0

      for (const goal of goals) {
        // Case A: Goal achieved
        if (Number(goal.current_amount) >= Number(goal.target_amount)) {
          // Check duplicate
          const { data: dup } = await supabaseAdmin
            .from('reminders')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'goal_achieved')
            .eq('related_entity_id', goal.id)
            .eq('is_read', false)
            .gte('created_at', yesterday)
            .limit(1)

          if (dup && dup.length > 0) continue

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
                { role: 'system', content: 'Você é um mentor financeiro casual e celebratório, PT-BR. Gere notificação de meta atingida. Responda APENAS JSON: { "title": "...", "message": "..." }. Título max 50 chars. Mensagem max 200 chars, casual, cite nome da meta e valor.' },
                { role: 'user', content: `Meta "${goal.name}" atingida! Valor alvo: R$${Number(goal.target_amount).toFixed(2)}, valor atual: R$${Number(goal.current_amount).toFixed(2)}.` }
              ]
            })
          })

          let title = 'Meta atingida! 🎉'
          let message = `Parabéns! Sua meta "${goal.name}" de R$${Number(goal.target_amount).toFixed(2)} foi atingida!`
          let tokens = MAX_TOKENS

          if (aiResp.ok) {
            const aiData = await aiResp.json()
            tokens = aiData.usage?.total_tokens || MAX_TOKENS
            try {
              const cleaned = (aiData.choices?.[0]?.message?.content || '').replace(/```json\n?/g, '').replace(/```/g, '').trim()
              const parsed = JSON.parse(cleaned)
              if (parsed.title) title = parsed.title
              if (parsed.message) message = parsed.message
            } catch { /* use fallback */ }
          }

          await supabaseAdmin.from('reminders').insert({
            user_id: userId,
            type: 'goal_achieved',
            title,
            message,
            data_points: [`Meta "${goal.name}": R$${Number(goal.current_amount).toFixed(2)} / R$${Number(goal.target_amount).toFixed(2)}`],
            related_entity_type: 'goal',
            related_entity_id: goal.id,
          })

          userTokensUsed += tokens
          userReminders++
          continue
        }

        // Case B: Goal at risk
        if (goal.deadline) {
          const deadline = new Date(goal.deadline)
          const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          if (daysRemaining <= 30 && daysRemaining > 0) {
            const progress = Number(goal.current_amount) / Number(goal.target_amount)

            if (progress < 0.6) {
              // Check duplicate
              const { data: dup } = await supabaseAdmin
                .from('reminders')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'goal_at_risk')
                .eq('related_entity_id', goal.id)
                .eq('is_read', false)
                .gte('created_at', yesterday)
                .limit(1)

              if (dup && dup.length > 0) continue

              const remaining = Number(goal.target_amount) - Number(goal.current_amount)
              const progressPct = (progress * 100).toFixed(0)

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
                    { role: 'system', content: 'Você é um mentor financeiro casual e encorajador, PT-BR. Gere notificação de meta em risco. Responda APENAS JSON: { "title": "...", "message": "..." }. Título max 50 chars. Mensagem max 200 chars, casual, cite nome, %, quanto falta, dias restantes.' },
                    { role: 'user', content: `Meta "${goal.name}": ${progressPct}% completa, faltam R$${remaining.toFixed(2)}, ${daysRemaining} dias restantes até ${goal.deadline}.` }
                  ]
                })
              })

              let title = 'Sua meta precisa de atenção'
              let message = `"${goal.name}" está em ${progressPct}% — faltam R$${remaining.toFixed(2)} em ${daysRemaining} dias.`
              let tokens = MAX_TOKENS

              if (aiResp.ok) {
                const aiData = await aiResp.json()
                tokens = aiData.usage?.total_tokens || MAX_TOKENS
                try {
                  const cleaned = (aiData.choices?.[0]?.message?.content || '').replace(/```json\n?/g, '').replace(/```/g, '').trim()
                  const parsed = JSON.parse(cleaned)
                  if (parsed.title) title = parsed.title
                  if (parsed.message) message = parsed.message
                } catch { /* use fallback */ }
              }

              await supabaseAdmin.from('reminders').insert({
                user_id: userId,
                type: 'goal_at_risk',
                title,
                message,
                data_points: [`Meta "${goal.name}": ${progressPct}% completa, faltam R$${remaining.toFixed(2)}, ${daysRemaining} dias`],
                related_entity_type: 'goal',
                related_entity_id: goal.id,
              })

              userTokensUsed += tokens
              userReminders++
            }
          }
        }
      }

      // Log token usage
      if (userTokensUsed > 0) {
        await supabaseAdmin.from('ai_token_usage').insert({
          user_id: userId,
          agent_name: AGENT_NAME,
          date: todayStr,
          tokens_used: userTokensUsed,
          request_count: userReminders,
        })
      }

      totalReminders += userReminders
      totalTokens += userTokensUsed
    }

    console.log(`[ai-goals-check] Created ${totalReminders} reminders, ~${totalTokens} tokens`)

    return new Response(
      JSON.stringify({ ok: true, reminders_created: totalReminders, tokens_used: totalTokens }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-goals-check] Error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
