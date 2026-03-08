import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255
}

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

function isValidName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true // optional
  return phone.length <= 20 && /^[0-9+\-() ]+$/.test(phone)
}

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Rate limiting by IP: 10 req/min
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    const supabaseForRateLimit = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: allowed } = await supabaseForRateLimit.rpc('check_rate_limit', {
      p_identifier: `ip:${clientIP}`,
      p_endpoint: 'register',
      p_max_requests: 10,
      p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Tente novamente em alguns segundos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { email, password, name, phone } = body

    // Validate email
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (!password || typeof password !== 'string' || !isValidPassword(password)) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter pelo menos 8 caracteres, incluindo letras e números' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate name
    if (!name || typeof name !== 'string' || !isValidName(name)) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter entre 2 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone (optional)
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string' || !isValidPhone(phone)) {
        return new Response(
          JSON.stringify({ error: 'Telefone inválido. Use apenas números, +, -, (, ) e espaços' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Use service role to create user (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false, // require email verification
      user_metadata: {
        name: trimmedName,
        phone: phone?.trim() || null,
      },
    })

    if (error) {
      // Generic error to avoid leaking info about existing accounts
      console.error('[register] Error:', error.message)
      
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta. Tente novamente mais tarde.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        message: 'Conta criada com sucesso. Verifique seu email para confirmar.',
        user_id: data.user?.id,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[register] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
