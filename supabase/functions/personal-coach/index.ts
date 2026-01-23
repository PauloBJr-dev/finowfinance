import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[personal-coach] ${req.method} request received`)

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
      console.log('[personal-coach] Missing or invalid authorization header')
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

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      console.log('[personal-coach] Invalid token:', claimsError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub
    console.log(`[personal-coach] Authenticated user: ${userId}`)

    // TODO: Implement personal coach functionality
    // - Actions: get_settings, update_settings, trigger_checkin
    // - Settings: weekly/monthly check-ins, permissions, persona memory
    // - Check-ins: Sunday 20:00 America/Sao_Paulo (weekly/monthly)
    return new Response(
      JSON.stringify({ 
        error: 'Not Implemented',
        message: 'Este endpoint ainda não foi implementado',
        endpoint: '/personal-coach',
        methods: ['POST'],
        notes: [
          'Actions: get_settings, update_settings, trigger_checkin',
          'Check-ins: domingo 20:00 America/Sao_Paulo',
          'Permissões granulares: allow_coach_use_transactions, allow_coach_use_invoices, allow_coach_use_goals',
          'Persona memory encriptada'
        ]
      }),
      { 
        status: 501, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[personal-coach] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
