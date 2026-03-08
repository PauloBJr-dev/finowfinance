import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
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
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Rate limiting: 30 req/min
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId,
      p_endpoint: 'profile',
      p_max_requests: 30,
      p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET — Fetch profile
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Perfil não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT — Update profile
    if (req.method === 'PUT') {
      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (body.name !== undefined) {
        if (typeof body.name !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Nome deve ser texto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const name = body.name.trim()
        if (name.length < 2 || name.length > 100) {
          return new Response(
            JSON.stringify({ error: 'Nome deve ter entre 2 e 100 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.name = name
      }

      if (body.phone !== undefined) {
        if (body.phone !== null && typeof body.phone !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Telefone inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (body.phone && body.phone.length > 20) {
          return new Response(
            JSON.stringify({ error: 'Telefone muito longo' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.phone = body.phone
      }

      if (body.timezone !== undefined) {
        if (typeof body.timezone !== 'string' || body.timezone.length > 50) {
          return new Response(
            JSON.stringify({ error: 'Timezone inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.timezone = body.timezone
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum campo para atualizar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('[profile] Error updating:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar perfil' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[profile] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
