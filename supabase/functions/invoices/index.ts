import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[invoices] ${req.method} request received`)

  try {
    // Apenas GET é permitido neste endpoint
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const invoiceId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    // Filtros
    const cardId = url.searchParams.get('card_id')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Buscar fatura específica com detalhes
    if (invoiceId && invoiceId !== 'invoices') {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          cards(*),
          accounts:paid_from_account_id(*)
        `)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single()

      if (invoiceError) {
        return new Response(
          JSON.stringify({ error: 'Fatura não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar transações associadas (não parceladas)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('invoice_id', invoiceId)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      // Buscar parcelas associadas
      const { data: installments } = await supabase
        .from('installments')
        .select(`
          *,
          installment_groups(
            *,
            transactions(*, categories(*))
          )
        `)
        .eq('invoice_id', invoiceId)
        .order('installment_number', { ascending: true })

      return new Response(
        JSON.stringify({
          ...invoice,
          transactions: transactions || [],
          installments: installments || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Listar faturas
    let query = supabase
      .from('invoices')
      .select(`
        *,
        cards(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('due_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (cardId) {
      query = query.eq('card_id', cardId)
    }

    if (status) {
      const validStatuses = ['open', 'closed', 'paid', 'overdue']
      if (validStatuses.includes(status)) {
        query = query.eq('status', status)
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[invoices] Error listing:', error.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao listar faturas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data, total: count, limit, offset }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[invoices] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
