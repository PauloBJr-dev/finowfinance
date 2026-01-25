import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge Function para fechamento automático de faturas
 * 
 * Esta função deve ser chamada diariamente (via cron) para fechar
 * faturas cujo closing_date já passou.
 * 
 * Regra: Faturas são fechadas às 23:59 do closing_day.
 * Portanto, no dia seguinte ao closing_date, a fatura deve ser fechada.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('[close-invoices] Starting automatic invoice closing job')

  try {
    // Criar cliente Supabase com service role para bypass de RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Chamar a função SQL que fecha faturas vencidas
    const { data, error } = await supabase.rpc('close_due_invoices')

    if (error) {
      console.error('[close-invoices] Error calling close_due_invoices:', error.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const closedCount = data || 0
    console.log(`[close-invoices] Successfully closed ${closedCount} invoices`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        closed_count: closedCount,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[close-invoices] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})