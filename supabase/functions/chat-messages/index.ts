import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[chat-messages] ${req.method} request received`)

  try {
    // Only POST is allowed
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[chat-messages] Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('[chat-messages] Invalid token:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log(`[chat-messages] Authenticated user: ${userId}`)

    // TODO: Implement chat with AI
    // - Check token budget (user cap: 5000 tokens/day)
    // - Call Gemini 3.0 Pro via Vertex AI
    // - Chat does NOT execute transactions automatically
    // - Return response with data_points used
    return new Response(
      JSON.stringify({ 
        error: 'Not Implemented',
        message: 'Este endpoint ainda não foi implementado',
        endpoint: '/chat-messages',
        methods: ['POST'],
        notes: [
          'Envia mensagem para o assistente IA (Gemini 3.0 Pro)',
          'Chat NÃO executa criação/edição de transações automaticamente',
          'Respeita token budget (5000 tokens/dia por usuário)',
          'Retorna data_points usados na resposta'
        ]
      }),
      { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[chat-messages] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
