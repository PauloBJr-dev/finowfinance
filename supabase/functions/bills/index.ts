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

const MAX_AMOUNT = 999_999_999.99
const MAX_RECURRING = 6

interface BillCreate {
  description: string
  amount: number
  category_id: string
  due_date: string
  is_recurring?: boolean
}

interface PayBillInput {
  bill_id: string
  payment_method: string
  account_id: string
  payment_date: string
}

function validateBillCreate(data: unknown): { valid: boolean; error?: string; data?: BillCreate } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Dados inválidos' }
  const obj = data as Record<string, unknown>

  // Description
  if (!obj.description || typeof obj.description !== 'string') {
    return { valid: false, error: 'Descrição é obrigatória' }
  }
  const desc = obj.description.trim()
  if (desc.length < 2 || desc.length > 200) {
    return { valid: false, error: 'Descrição deve ter entre 2 e 200 caracteres' }
  }

  // Amount
  const amount = Number(obj.amount)
  if (isNaN(amount) || amount <= 0) return { valid: false, error: 'Valor deve ser maior que zero' }
  if (amount > MAX_AMOUNT) return { valid: false, error: 'Valor excede o limite permitido' }
  const rounded = Math.round(amount * 100) / 100
  if (rounded !== amount) return { valid: false, error: 'Valor deve ter no máximo 2 casas decimais' }

  // Category
  if (!obj.category_id || typeof obj.category_id !== 'string') {
    return { valid: false, error: 'Categoria é obrigatória' }
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(obj.category_id)) {
    return { valid: false, error: 'ID de categoria inválido' }
  }

  // Due date
  if (!obj.due_date || typeof obj.due_date !== 'string') {
    return { valid: false, error: 'Data de vencimento é obrigatória' }
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(obj.due_date)) {
    return { valid: false, error: 'Data de vencimento deve estar no formato YYYY-MM-DD' }
  }
  const parsed = new Date(obj.due_date + 'T00:00:00Z')
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Data de vencimento inválida' }
  }

  return {
    valid: true,
    data: {
      description: desc,
      amount,
      category_id: obj.category_id,
      due_date: obj.due_date,
      is_recurring: obj.is_recurring === true,
    },
  }
}

function validatePayBill(data: unknown): { valid: boolean; error?: string; data?: PayBillInput } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Dados inválidos' }
  const obj = data as Record<string, unknown>
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!obj.bill_id || typeof obj.bill_id !== 'string' || !uuidRegex.test(obj.bill_id)) {
    return { valid: false, error: 'ID da conta inválido' }
  }

  const validMethods = ['cash', 'debit', 'transfer', 'boleto', 'credit_card', 'voucher', 'split']
  if (!obj.payment_method || !validMethods.includes(obj.payment_method as string)) {
    return { valid: false, error: 'Método de pagamento inválido' }
  }

  if (!obj.account_id || typeof obj.account_id !== 'string' || !uuidRegex.test(obj.account_id)) {
    return { valid: false, error: 'ID da conta bancária inválido' }
  }

  if (!obj.payment_date || typeof obj.payment_date !== 'string') {
    return { valid: false, error: 'Data de pagamento é obrigatória' }
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(obj.payment_date as string)) {
    return { valid: false, error: 'Data de pagamento deve estar no formato YYYY-MM-DD' }
  }

  return {
    valid: true,
    data: {
      bill_id: obj.bill_id,
      payment_method: obj.payment_method as string,
      account_id: obj.account_id,
      payment_date: obj.payment_date as string,
    },
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[bills] ${req.method} request received`)

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
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    // POST /bills/pay — Atomic pay bill
    if (req.method === 'POST' && lastSegment === 'pay') {
      const body = await req.json()
      const validation = validatePayBill(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const input = validation.data!

      // Verify bill exists and belongs to user
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', input.bill_id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single()

      if (billError || !bill) {
        return new Response(
          JSON.stringify({ error: 'Conta não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (bill.status === 'paid') {
        return new Response(
          JSON.stringify({ error: 'Esta conta já foi paga' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify account belongs to user
      const { data: account, error: accError } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', input.account_id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single()

      if (accError || !account) {
        return new Response(
          JSON.stringify({ error: 'Conta bancária não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Step 1: Create expense transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: bill.amount,
          type: 'expense',
          payment_method: input.payment_method,
          account_id: input.account_id,
          category_id: bill.category_id,
          description: bill.description,
          date: input.payment_date,
        })
        .select()
        .single()

      if (txError) {
        console.error('[bills] Error creating pay transaction:', txError.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar transação de pagamento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Step 2: Update bill status
      const { error: updateError } = await supabase
        .from('bills')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_transaction_id: transaction.id,
          account_id: input.account_id,
          payment_method: input.payment_method,
        })
        .eq('id', input.bill_id)
        .eq('user_id', userId)

      if (updateError) {
        // Rollback: soft-delete the transaction we just created
        console.error('[bills] Error updating bill status, rolling back transaction:', updateError.message)
        await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar status da conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bills] Bill ${input.bill_id} paid with transaction ${transaction.id}`)
      return new Response(
        JSON.stringify({ bill: { ...bill, status: 'paid' }, transaction }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /bills — Create bill(s)
    if (req.method === 'POST') {
      const body = await req.json()
      const validation = validateBillCreate(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const input = validation.data!

      // Verify category belongs to user or is system
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('id, is_system, user_id')
        .eq('id', input.category_id)
        .single()

      if (catError || !category) {
        return new Response(
          JSON.stringify({ error: 'Categoria não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!category.is_system && category.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Categoria não pertence ao usuário' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const billsToCreate: Array<Record<string, unknown>> = []
      const recurrenceGroupId = input.is_recurring ? crypto.randomUUID() : null

      const count = input.is_recurring ? MAX_RECURRING : 1
      for (let i = 0; i < count; i++) {
        const baseDate = new Date(input.due_date + 'T00:00:00Z')
        baseDate.setUTCMonth(baseDate.getUTCMonth() + i)
        billsToCreate.push({
          user_id: userId,
          description: input.description,
          amount: input.amount,
          category_id: input.category_id,
          due_date: baseDate.toISOString().split('T')[0],
          status: 'pending',
          recurrence_group_id: recurrenceGroupId,
        })
      }

      const { data, error } = await supabase
        .from('bills')
        .insert(billsToCreate)
        .select()

      if (error) {
        console.error('[bills] Error creating bills:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar conta a pagar' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[bills] Created ${data.length} bill(s)`)
      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE — Soft delete
    if (req.method === 'DELETE') {
      const billId = lastSegment
      if (!billId || billId === 'bills') {
        return new Response(
          JSON.stringify({ error: 'ID da conta é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', billId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Conta excluída', data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH — Restore
    if (req.method === 'PATCH') {
      const billId = lastSegment
      if (!billId || billId === 'bills') {
        return new Response(
          JSON.stringify({ error: 'ID da conta é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ deleted_at: null })
        .eq('id', billId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao restaurar conta' }),
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
    console.error('[bills] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
