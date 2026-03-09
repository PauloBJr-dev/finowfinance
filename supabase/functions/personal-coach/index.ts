import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const DAILY_TOKEN_LIMIT = 5000
const MAX_TOKENS_CHECKIN = 400
const LOVABLE_API_URL = "https://ai.lovable.dev/v1/chat/completions"

interface UserSettings {
  user_id: string
  weekly_checkin_enabled: boolean
  monthly_checkin_enabled: boolean
  checkin_time: string
  allow_coach_use_transactions: boolean
  allow_coach_use_goals: boolean
  daily_token_limit: number
}

interface FinancialContext {
  transactions?: {
    total_expenses: number
    total_income: number
    count: number
    top_categories: { name: string; amount: number }[]
  }
  goals?: {
    active_count: number
    goals: { name: string; progress: number; target: number }[]
  }
  bills?: {
    upcoming_count: number
    overdue_count: number
  }
}

// Verificar se é o último domingo do mês
function isLastSundayOfMonth(date: Date): boolean {
  const nextSunday = new Date(date)
  nextSunday.setDate(date.getDate() + 7)
  return nextSunday.getMonth() !== date.getMonth()
}

// Buscar contexto financeiro respeitando consentimentos
async function fetchFinancialContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settings: UserSettings,
  isMonthly: boolean
): Promise<FinancialContext> {
  const context: FinancialContext = {}
  const now = new Date()
  
  // Período: última semana ou último mês
  const startDate = new Date(now)
  if (isMonthly) {
    startDate.setMonth(startDate.getMonth() - 1)
  } else {
    startDate.setDate(startDate.getDate() - 7)
  }
  const startDateStr = startDate.toISOString().split('T')[0]
  
  if (settings.allow_coach_use_transactions) {
    // Buscar transações
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, category_id, categories(name)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', startDateStr)
    
    if (transactions && transactions.length > 0) {
      const expenses = transactions.filter((t: any) => t.type === 'expense')
      const income = transactions.filter((t: any) => t.type === 'income')
      
      // Top categorias de despesa
      const categoryTotals: Record<string, number> = {}
      for (const t of expenses) {
        const catName = (t.categories as any)?.name || 'Outros'
        categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount)
      }
      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount }))
      
      context.transactions = {
        total_expenses: expenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0),
        total_income: income.reduce((sum: number, t: any) => sum + Number(t.amount), 0),
        count: transactions.length,
        top_categories: topCategories,
      }
    }
    
    // Buscar contas a pagar
    const { data: bills } = await supabase
      .from('bills')
      .select('status')
      .eq('user_id', userId)
      .is('deleted_at', null)
    
    if (bills) {
      context.bills = {
        upcoming_count: bills.filter((b: any) => b.status === 'pending').length,
        overdue_count: bills.filter((b: any) => b.status === 'overdue').length,
      }
    }
  }
  
  if (settings.allow_coach_use_goals) {
    const { data: goals } = await supabase
      .from('goals')
      .select('name, current_amount, target_amount')
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('deleted_at', null)
    
    if (goals && goals.length > 0) {
      context.goals = {
        active_count: goals.length,
        goals: goals.map((g: any) => ({
          name: g.name,
          progress: Number(g.current_amount),
          target: Number(g.target_amount),
        })),
      }
    }
  }
  
  return context
}

// Verificar uso de tokens hoje
async function checkTokenBudget(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit: number
): Promise<{ allowed: boolean; used: number }> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data } = await supabase
    .from('ai_token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('date', today)
  
  const used = data?.reduce((sum, u) => sum + u.tokens_used, 0) || 0
  return { allowed: used + MAX_TOKENS_CHECKIN <= limit, used }
}

// Verificar duplicata nas últimas 24h
async function checkDuplicate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  type: string
): Promise<boolean> {
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  
  const { count } = await supabase
    .from('reminders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', yesterday.toISOString())
  
  return (count || 0) > 0
}

// Gerar check-in via Lovable AI
async function generateCheckin(
  context: FinancialContext,
  isMonthly: boolean,
  apiKey: string
): Promise<{ message: string; dataPoints: string[]; tokensUsed: number }> {
  const period = isMonthly ? 'mês' : 'semana'
  const tone = isMonthly ? 'mentor reflexivo' : 'amigo casual'
  
  const dataPoints: string[] = []
  let contextText = ''
  
  if (context.transactions) {
    contextText += `\n- Total de despesas: R$ ${context.transactions.total_expenses.toFixed(2)}`
    contextText += `\n- Total de receitas: R$ ${context.transactions.total_income.toFixed(2)}`
    contextText += `\n- ${context.transactions.count} transações registradas`
    if (context.transactions.top_categories.length > 0) {
      contextText += `\n- Principais categorias de gasto: ${context.transactions.top_categories.map(c => `${c.name} (R$ ${c.amount.toFixed(2)})`).join(', ')}`
    }
    dataPoints.push('transações', 'despesas', 'receitas')
  }
  
  if (context.bills) {
    if (context.bills.upcoming_count > 0) {
      contextText += `\n- ${context.bills.upcoming_count} conta(s) a pagar pendente(s)`
      dataPoints.push('contas a pagar')
    }
    if (context.bills.overdue_count > 0) {
      contextText += `\n- ${context.bills.overdue_count} conta(s) vencida(s)`
      dataPoints.push('contas vencidas')
    }
  }
  
  if (context.goals) {
    contextText += `\n- ${context.goals.active_count} meta(s) ativa(s)`
    for (const g of context.goals.goals.slice(0, 2)) {
      const pct = ((g.progress / g.target) * 100).toFixed(0)
      contextText += `\n  • ${g.name}: ${pct}% (R$ ${g.progress.toFixed(2)} de R$ ${g.target.toFixed(2)})`
    }
    dataPoints.push('metas')
  }
  
  if (!contextText) {
    contextText = '\n- Nenhum dado disponível para análise.'
  }
  
  const systemPrompt = `Você é o mentor financeiro do Finow, um app de finanças pessoais.
Tom: ${tone}. Idioma: PT-BR.

REGRAS:
1. Nunca invente dados, números ou datas que não estejam no contexto
2. Se faltar informação, não preencha com suposições
3. Resposta breve (2-3 parágrafos no máximo)
4. Termine com UMA pergunta aberta para engajar o usuário
5. Use emojis com moderação (1-2 no máximo)
6. Não dê conselhos de investimento ou crédito regulados`

  const userPrompt = `Gere um resumo financeiro ${isMonthly ? 'mensal' : 'semanal'} para o usuário.

Dados da ${period}:${contextText}

Faça um resumo amigável destacando pontos positivos e áreas de atenção. Termine com uma pergunta.`

  const response = await fetch(LOVABLE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: MAX_TOKENS_CHECKIN,
      temperature: 0.7,
    }),
  })
  
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API error: ${response.status} - ${errText}`)
  }
  
  const result = await response.json()
  const message = result.choices?.[0]?.message?.content || 'Não foi possível gerar o resumo.'
  const tokensUsed = result.usage?.total_tokens || MAX_TOKENS_CHECKIN
  
  return { message, dataPoints, tokensUsed }
}

// Registrar uso de tokens
async function recordTokenUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tokensUsed: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  // Tentar atualizar registro existente
  const { data: existing } = await supabase
    .from('ai_token_usage')
    .select('id, tokens_used, request_count')
    .eq('user_id', userId)
    .eq('agent_name', 'personal_coach')
    .eq('date', today)
    .single()
  
  if (existing) {
    await supabase
      .from('ai_token_usage')
      .update({
        tokens_used: existing.tokens_used + tokensUsed,
        request_count: existing.request_count + 1,
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_token_usage')
      .insert({
        user_id: userId,
        agent_name: 'personal_coach',
        tokens_used: tokensUsed,
        request_count: 1,
        date: today,
      })
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[personal-coach] ${req.method} request received`)

  try {
    // Apenas POST permitido
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar CRON_SECRET
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.log('[personal-coach] Invalid or missing x-cron-secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const body = await req.json()
    const requestedType = body.type as 'weekly' | 'monthly'
    
    if (!requestedType || !['weekly', 'monthly'].includes(requestedType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Expected "weekly" or "monthly"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[personal-coach] Processing ${requestedType} check-ins`)

    // Criar cliente com service_role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verificar se é o último domingo do mês
    const now = new Date()
    const isLastSunday = isLastSundayOfMonth(now)
    
    // Lógica de tipo efetivo
    let effectiveType: 'weekly' | 'monthly'
    
    if (requestedType === 'weekly') {
      if (isLastSunday) {
        // No último domingo, o weekly é substituído pelo monthly
        console.log('[personal-coach] Last Sunday detected, skipping weekly (monthly takes over)')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Skipped weekly - last Sunday of month (monthly takes over)',
            processed: 0 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      effectiveType = 'weekly'
    } else {
      if (!isLastSunday) {
        console.log('[personal-coach] Not last Sunday, skipping monthly')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Skipped monthly - not last Sunday of month',
            processed: 0 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      effectiveType = 'monthly'
    }

    // Buscar todos os usuários com ai_settings
    const { data: allSettings, error: settingsError } = await supabase
      .from('ai_settings')
      .select('user_id, weekly_checkin_enabled, monthly_checkin_enabled, checkin_time, allow_coach_use_transactions, allow_coach_use_goals, daily_token_limit')
    
    if (settingsError) {
      console.error('[personal-coach] Error fetching settings:', settingsError)
      throw settingsError
    }

    const settings = allSettings as UserSettings[]
    console.log(`[personal-coach] Found ${settings.length} users with ai_settings`)

    let processedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const userSettings of settings) {
      try {
        const userId = userSettings.user_id
        const reminderType = `${effectiveType}_checkin`
        
        // 1. Verificar se o check-in está habilitado
        const isEnabled = effectiveType === 'weekly' 
          ? userSettings.weekly_checkin_enabled 
          : userSettings.monthly_checkin_enabled
        
        if (!isEnabled) {
          console.log(`[personal-coach] User ${userId}: ${effectiveType} check-in disabled`)
          skippedCount++
          continue
        }

        // 2. Verificar consentimentos - se AMBOS desativados, pular
        if (!userSettings.allow_coach_use_transactions && !userSettings.allow_coach_use_goals) {
          console.log(`[personal-coach] User ${userId}: No data consent`)
          skippedCount++
          continue
        }

        // 3. Verificar duplicata (24h)
        const hasDuplicate = await checkDuplicate(supabase, userId, reminderType)
        if (hasDuplicate) {
          console.log(`[personal-coach] User ${userId}: Duplicate check-in in last 24h`)
          skippedCount++
          continue
        }

        // 4. Verificar budget de tokens
        const tokenLimit = userSettings.daily_token_limit || DAILY_TOKEN_LIMIT
        const { allowed, used } = await checkTokenBudget(supabase, userId, tokenLimit)
        if (!allowed) {
          console.log(`[personal-coach] User ${userId}: Token budget exceeded (${used}/${tokenLimit})`)
          skippedCount++
          continue
        }

        // 5. Buscar contexto financeiro
        const context = await fetchFinancialContext(
          supabase, 
          userId, 
          userSettings, 
          effectiveType === 'monthly'
        )

        // 6. Gerar check-in via IA
        const { message, dataPoints, tokensUsed } = await generateCheckin(
          context,
          effectiveType === 'monthly',
          lovableApiKey
        )

        // 7. Calcular expires_at
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + (effectiveType === 'monthly' ? 30 : 7))

        // 8. Inserir reminder
        const { error: insertError } = await supabase
          .from('reminders')
          .insert({
            user_id: userId,
            type: reminderType,
            title: effectiveType === 'weekly' ? 'Seu resumo da semana' : 'Seu resumo do mês',
            message: message,
            data_points: dataPoints,
            related_entity_type: 'coach_checkin',
            expires_at: expiresAt.toISOString(),
            is_read: false,
          })

        if (insertError) {
          console.error(`[personal-coach] User ${userId}: Insert error:`, insertError)
          errors.push(`${userId}: ${insertError.message}`)
          continue
        }

        // 9. Registrar uso de tokens
        await recordTokenUsage(supabase, userId, tokensUsed)

        processedCount++
        console.log(`[personal-coach] User ${userId}: Check-in created (${tokensUsed} tokens)`)
        
      } catch (userError) {
        console.error(`[personal-coach] User ${userSettings.user_id}: Error:`, userError)
        errors.push(`${userSettings.user_id}: ${(userError as Error).message}`)
      }
    }

    console.log(`[personal-coach] Complete: ${processedCount} processed, ${skippedCount} skipped, ${errors.length} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        type: effectiveType,
        processed: processedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[personal-coach] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
