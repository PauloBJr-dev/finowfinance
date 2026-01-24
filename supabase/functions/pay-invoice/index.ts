import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayInvoiceRequest {
  invoice_id: string;
  account_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[pay-invoice] ${req.method} request received`)

  try {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
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
    console.log(`[pay-invoice] Authenticated user: ${userId}`)

    // Validar request body
    const body = await req.json() as PayInvoiceRequest

    if (!body.invoice_id) {
      return new Response(
        JSON.stringify({ error: 'ID da fatura é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.account_id) {
      return new Response(
        JSON.stringify({ error: 'ID da conta é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Buscar fatura e validar
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, cards(*)')
      .eq('id', body.invoice_id)
      .eq('user_id', userId)
      .single()

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Fatura não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invoice.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Esta fatura já foi paga' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invoice.total_amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Fatura não possui valor a pagar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validar conta
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', body.account_id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single()

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Buscar categoria "Pagamento de Fatura"
    const { data: paymentCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Pagamento de Fatura')
      .eq('is_system', true)
      .single()

    const categoryId = paymentCategory?.id || null

    // 4. Criar transação de despesa na conta
    const cardName = invoice.cards?.name || 'Cartão'
    const referenceMonth = new Date(invoice.reference_month)
    const monthName = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const { data: paymentTransaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: invoice.total_amount,
        type: 'expense',
        payment_method: 'transfer',
        date: new Date().toISOString().split('T')[0],
        description: `Pagamento fatura ${cardName} - ${monthName}`,
        category_id: categoryId,
        account_id: body.account_id,
        tags: ['pagamento-fatura'],
      })
      .select()
      .single()

    if (txError) {
      console.error('[pay-invoice] Error creating payment transaction:', txError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar transação de pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[pay-invoice] Created payment transaction: ${paymentTransaction.id}`)

    // 5. Atualizar fatura para 'paid'
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_from_account_id: body.account_id,
      })
      .eq('id', body.invoice_id)
      .eq('user_id', userId)

    if (updateInvoiceError) {
      console.error('[pay-invoice] Error updating invoice:', updateInvoiceError.message)
      // Não retorna erro pois a transação já foi criada
    }

    // 6. Marcar parcelas como reconciled
    const { error: updateInstallmentsError } = await supabase
      .from('installments')
      .update({ status: 'reconciled' })
      .eq('invoice_id', body.invoice_id)

    if (updateInstallmentsError) {
      console.error('[pay-invoice] Error updating installments:', updateInstallmentsError.message)
      // Não retorna erro pois é secundário
    }

    console.log(`[pay-invoice] Invoice ${body.invoice_id} paid successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fatura de R$ ${invoice.total_amount.toFixed(2)} paga com sucesso!`,
        invoice_id: body.invoice_id,
        transaction_id: paymentTransaction.id,
        amount: invoice.total_amount,
        card_name: cardName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[pay-invoice] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
