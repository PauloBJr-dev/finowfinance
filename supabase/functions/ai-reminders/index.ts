import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://finowfinance.lovable.app',
  'https://id-preview--091dae34-4e4b-4820-8fe0-751ab428a6c7.lovable.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }
}

// Constantes de governança
const AGENT_NAME = 'reminders'
const DAILY_TOKEN_LIMIT_PER_AGENT = 5000
const ESTIMATED_TOKENS_PER_REQUEST = 100

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[ai-reminders] ${req.method} request received`)

  // Validate cron secret - this endpoint is only for scheduled jobs
  const cronSecret = req.headers.get('x-cron-secret')
  const expectedSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    console.log('[ai-reminders] Unauthorized: invalid or missing cron secret')
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Para cron jobs, usar service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Verificar limite do agente
    const { data: agentUsage } = await supabaseAdmin
      .from('ai_token_usage')
      .select('tokens_used')
      .eq('agent_name', AGENT_NAME)
      .eq('date', todayStr)

    const totalAgentTokens = agentUsage?.reduce((sum, u) => sum + u.tokens_used, 0) || 0

    if (totalAgentTokens >= DAILY_TOKEN_LIMIT_PER_AGENT) {
      console.log(`[ai-reminders] Agent ${AGENT_NAME} exceeded daily limit`)
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Limite diário do agente atingido',
          reminders_created: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar usuários com reminders habilitados
    const { data: usersWithSettings } = await supabaseAdmin
      .from('ai_settings')
      .select('user_id')
      .eq('reminders_enabled', true)

    if (!usersWithSettings || usersWithSettings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Nenhum usuário com reminders habilitados',
          reminders_created: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = usersWithSettings.map(u => u.user_id)
    let remindersCreated = 0
    let tokensUsed = 0

    // Para cada usuário, verificar faturas
    for (const userId of userIds) {
      // Verificar limite do usuário
      const { data: userUsage } = await supabaseAdmin
        .from('ai_token_usage')
        .select('tokens_used')
        .eq('user_id', userId)
        .eq('date', todayStr)

      const userTokens = userUsage?.reduce((sum, u) => sum + u.tokens_used, 0) || 0
      
      const { data: userSettings } = await supabaseAdmin
        .from('ai_settings')
        .select('daily_token_limit')
        .eq('user_id', userId)
        .single()

      const userLimit = userSettings?.daily_token_limit || 5000

      if (userTokens >= userLimit) {
        console.log(`[ai-reminders] User ${userId} exceeded daily limit`)
        continue
      }

      // Buscar faturas que precisam de reminder
      const threeDaysFromNow = new Date(today)
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      // 1. Faturas próximas do vencimento (3 dias)
      const { data: upcomingInvoices } = await supabaseAdmin
        .from('invoices')
        .select('id, due_date, total_amount, status, cards(name)')
        .eq('user_id', userId)
        .in('status', ['open', 'closed'])
        .gte('due_date', todayStr)
        .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])
        .gt('total_amount', 0)

      for (const invoice of upcomingInvoices || []) {
        // Verificar se já existe reminder para esta fatura hoje
        const { data: existingReminder } = await supabaseAdmin
          .from('reminders')
          .select('id')
          .eq('user_id', userId)
          .eq('related_entity_id', invoice.id)
          .eq('type', 'invoice_due')
          .gte('created_at', todayStr)
          .single()

        if (existingReminder) continue

        const dueDate = new Date(invoice.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const cardName = (invoice.cards as any)?.name || 'Cartão'

        const title = daysUntilDue === 0 
          ? `Fatura do ${cardName} vence hoje`
          : `Fatura do ${cardName} vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`

        const message = daysUntilDue === 0
          ? `Sua fatura de R$ ${invoice.total_amount.toFixed(2)} do ${cardName} vence hoje. Se quiser, dá uma olhada quando for um bom momento.`
          : `Sua fatura de R$ ${invoice.total_amount.toFixed(2)} do ${cardName} vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}. Fica tranquilo, é só um lembrete amigável.`

        await supabaseAdmin
          .from('reminders')
          .insert({
            user_id: userId,
            type: 'invoice_due',
            title,
            message,
            data_points: {
              card_name: cardName,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
              days_until_due: daysUntilDue,
            },
            related_entity_type: 'invoice',
            related_entity_id: invoice.id,
            expires_at: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          })

        remindersCreated++
        tokensUsed += ESTIMATED_TOKENS_PER_REQUEST
      }

      // 2. Faturas fechadas não pagas
      const { data: closedUnpaidInvoices } = await supabaseAdmin
        .from('invoices')
        .select('id, due_date, total_amount, status, cards(name)')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .lt('due_date', todayStr)
        .gt('total_amount', 0)

      for (const invoice of closedUnpaidInvoices || []) {
        // Verificar se já existe reminder
        const { data: existingReminder } = await supabaseAdmin
          .from('reminders')
          .select('id')
          .eq('user_id', userId)
          .eq('related_entity_id', invoice.id)
          .eq('type', 'invoice_overdue')
          .is('dismissed_at', null)
          .single()

        if (existingReminder) continue

        const cardName = (invoice.cards as any)?.name || 'Cartão'
        const dueDate = new Date(invoice.due_date)

        const title = `Fatura do ${cardName} ainda não paga`
        const message = `Essa fatura de R$ ${invoice.total_amount.toFixed(2)} do ${cardName} já fechou e ainda não foi paga. Quer dar uma olhada?`

        await supabaseAdmin
          .from('reminders')
          .insert({
            user_id: userId,
            type: 'invoice_overdue',
            title,
            message,
            data_points: {
              card_name: cardName,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
            },
            related_entity_type: 'invoice',
            related_entity_id: invoice.id,
          })

        remindersCreated++
        tokensUsed += ESTIMATED_TOKENS_PER_REQUEST
      }

      // Registrar uso de tokens (se houve reminders)
      if (tokensUsed > 0) {
        await supabaseAdmin
          .from('ai_token_usage')
          .upsert({
            user_id: userId,
            agent_name: AGENT_NAME,
            date: todayStr,
            tokens_used: tokensUsed,
            request_count: remindersCreated,
          }, {
            onConflict: 'user_id,agent_name,date',
          })
      }
    }

    console.log(`[ai-reminders] Created ${remindersCreated} reminders, used ~${tokensUsed} tokens`)

    return new Response(
      JSON.stringify({
        success: true,
        reminders_created: remindersCreated,
        tokens_used: tokensUsed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-reminders] Internal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
