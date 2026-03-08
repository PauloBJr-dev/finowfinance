import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const AGENT_NAME = 'chat'
const USER_DAILY_CAP = 5000
const MAX_MESSAGE_LENGTH = 500

// ─── AES-256-CBC encrypt / decrypt ───────────────────────────
async function deriveKey(hex: string): Promise<CryptoKey> {
  const raw = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  return crypto.subtle.importKey('raw', raw, 'AES-CBC', false, ['encrypt', 'decrypt'])
}

async function encrypt(text: string, keyHex: string): Promise<string> {
  const key = await deriveKey(keyHex)
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const encoded = new TextEncoder().encode(text)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + cipher.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipher), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(b64: string, keyHex: string): Promise<string | null> {
  try {
    const key = await deriveKey(keyHex)
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const iv = raw.slice(0, 16)
    const data = raw.slice(16)
    const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data)
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

// ─── Default persona ─────────────────────────────────────────
const DEFAULT_PERSONA = { tone: 'casual', summary_length: 'short' }

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

    // Parse body
    const body = await req.json()
    const { action } = body

    // ─── ACTION: update_persona ─────────────────────────────
    if (action === 'update_persona') {
      const { persona } = body
      if (!persona || typeof persona !== 'object') {
        return new Response(JSON.stringify({ error: 'persona é obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const keyHex = Deno.env.get('PERSONA_MEMORY_KEY')
      if (!keyHex) {
        return new Response(JSON.stringify({ error: 'Encryption key not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const encrypted = await encrypt(JSON.stringify(persona), keyHex)

      const { error: updateError } = await supabase
        .from('ai_settings')
        .update({ persona_memory: encrypted })
        .eq('user_id', userId)

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Erro ao salvar preferências' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── ACTION: get_persona ────────────────────────────────
    if (action === 'get_persona') {
      const { data: settings } = await supabase
        .from('ai_settings')
        .select('persona_memory')
        .eq('user_id', userId)
        .single()

      const keyHex = Deno.env.get('PERSONA_MEMORY_KEY')
      let persona = DEFAULT_PERSONA

      if (settings?.persona_memory && keyHex) {
        const decrypted = await decrypt(settings.persona_memory as string, keyHex)
        if (decrypted) {
          try { persona = JSON.parse(decrypted) } catch { /* use default */ }
        }
      }

      return new Response(JSON.stringify({ persona }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── ACTION: chat (default) ─────────────────────────────

    // Rate limiting: 20 req/min
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId,
      p_endpoint: 'finow-chat',
      p_max_requests: 20,
      p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { messages } = body
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

    // ─── Fetch ai_settings + consents ───────────────────────
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('allow_coach_use_transactions, allow_coach_use_goals, store_conversations, persona_memory')
      .eq('user_id', userId)
      .single()

    const consents = {
      transactions: aiSettings?.allow_coach_use_transactions ?? true,
      goals: aiSettings?.allow_coach_use_goals ?? true,
    }

    // ─── Decrypt persona_memory ─────────────────────────────
    const keyHex = Deno.env.get('PERSONA_MEMORY_KEY')
    let persona = { ...DEFAULT_PERSONA }
    if (aiSettings?.persona_memory && keyHex) {
      const decrypted = await decrypt(aiSettings.persona_memory as string, keyHex)
      if (decrypted) {
        try { persona = { ...DEFAULT_PERSONA, ...JSON.parse(decrypted) } } catch { /* defaults */ }
      }
    }

    // ─── Fetch financial context in parallel (respecting consents) ───
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const dataPoints: string[] = []
    const fetches: Promise<any>[] = []

    // Always fetch accounts (basic context)
    fetches.push(
      supabase.from('accounts').select('name, type, current_balance')
        .eq('user_id', userId).is('deleted_at', null)
    )
    dataPoints.push('Contas bancárias')

    if (consents.transactions) {
      fetches.push(
        supabase.from('transactions')
          .select('amount, type, description, date, categories(name)')
          .eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd)
          .is('deleted_at', null).order('date', { ascending: false }).limit(100)
      )
      fetches.push(
        supabase.from('bills')
          .select('description, amount, due_date, status')
          .eq('user_id', userId).is('deleted_at', null)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true }).limit(10)
      )
      dataPoints.push('Transações do mês', 'Contas a pagar')
    } else {
      fetches.push(Promise.resolve({ data: [] }))
      fetches.push(Promise.resolve({ data: [] }))
    }

    if (consents.goals) {
      fetches.push(
        supabase.from('goals')
          .select('name, target_amount, current_amount, deadline, status')
          .eq('user_id', userId).eq('status', 'active')
          .is('deleted_at', null).limit(10)
      )
      dataPoints.push('Metas ativas')
    } else {
      fetches.push(Promise.resolve({ data: [] }))
    }

    const [accountsResult, txResult, billsResult, goalsResult] = await Promise.all(fetches)

    const accounts = accountsResult.data || []
    const txs = txResult.data || []
    const bills = billsResult.data || []
    const goals = goalsResult.data || []

    const totalExpenses = txs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalIncome = txs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0)

    // Build context sections
    let financialContext = `
CONTEXTO FINANCEIRO ATUAL DO USUÁRIO (use para personalizar suas respostas):
- Mês atual: ${monthStart} a ${monthEnd}
- Saldo total em contas: R$ ${totalBalance.toFixed(2)}
- Contas: ${accounts.map((a: any) => `${a.name} (${a.type}): R$ ${Number(a.current_balance).toFixed(2)}`).join('; ') || 'nenhuma'}`

    if (consents.transactions) {
      financialContext += `
- Receitas do mês: R$ ${totalIncome.toFixed(2)}
- Despesas do mês: R$ ${totalExpenses.toFixed(2)}
- Contas a pagar pendentes: ${bills.map((b: any) => `${b.description}: R$ ${Number(b.amount).toFixed(2)} vence ${b.due_date}`).join('; ') || 'nenhuma'}
- Transações recentes: ${txs.slice(0, 15).map((t: any) => `${t.type === 'expense' ? '-' : '+'}R$ ${Number(t.amount).toFixed(2)} ${t.description || ''} (${(t as any).categories?.name || 'sem cat'})`).join('; ') || 'nenhuma'}`
    }

    if (consents.goals) {
      financialContext += `
- Metas ativas: ${goals.map((g: any) => `${g.name}: R$ ${Number(g.current_amount).toFixed(2)} de R$ ${Number(g.target_amount).toFixed(2)}${g.deadline ? ` (prazo: ${g.deadline})` : ''}`).join('; ') || 'nenhuma'}`
    }

    financialContext = financialContext.trim()

    // ─── Persona-aware system prompt ────────────────────────
    const toneInstruction = persona.tone === 'formal'
      ? 'Use tom formal e profissional, tratando o usuário por "você".'
      : 'Use tom casual e amigável, como um amigo que entende de finanças.'

    const lengthInstruction = persona.summary_length === 'long'
      ? 'Seja detalhado nas respostas, com até 5 parágrafos quando necessário.'
      : 'Seja conciso (máximo 3 parágrafos por resposta).'

    const systemPrompt = `Você é o mentor financeiro do Finow, um app de finanças pessoais. Fale sempre em PT-BR.
${toneInstruction}
${lengthInstruction}

REGRAS IMPORTANTES:
1. NUNCA execute, crie ou edite transações. Você pode sugerir ações e instruir o usuário como fazer.
2. NUNCA dê conselhos de investimento, crédito ou seguros. Para esses temas, recomende buscar um profissional licenciado.
3. NUNCA invente dados — use apenas as informações do contexto financeiro abaixo.
4. Quando citar números, use os dados reais do contexto.

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

    // Record estimated token usage
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

    // ─── Stream response + append meta event with data_points ───
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Pipe AI stream, then append meta event
    ;(async () => {
      try {
        const reader = aiResponse.body!.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(value)
        }
        // Append meta event before closing
        const metaEvent = `data: ${JSON.stringify({ meta: { data_points: dataPoints } })}\n\n`
        await writer.write(encoder.encode(metaEvent))
        await writer.write(encoder.encode('data: [DONE]\n\n'))
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
