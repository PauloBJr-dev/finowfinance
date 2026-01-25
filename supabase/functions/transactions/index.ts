import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tipos
interface TransactionCreate {
  amount: number;
  type: 'expense' | 'income';
  payment_method: 'cash' | 'debit' | 'transfer' | 'boleto' | 'credit_card' | 'voucher' | 'split';
  date?: string;
  description?: string;
  category_id?: string;
  account_id?: string;
  card_id?: string;
  tags?: string[];
  installments?: number;
}

// Validação
function validateTransactionCreate(data: unknown): { valid: boolean; error?: string; data?: TransactionCreate } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const obj = data as Record<string, unknown>;
  
  const amount = Number(obj.amount);
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Valor deve ser maior que zero' };
  }

  const validTypes = ['expense', 'income'];
  if (!obj.type || !validTypes.includes(obj.type as string)) {
    return { valid: false, error: 'Tipo de transação inválido' };
  }

  const validMethods = ['cash', 'debit', 'transfer', 'boleto', 'credit_card', 'voucher', 'split'];
  if (!obj.payment_method || !validMethods.includes(obj.payment_method as string)) {
    return { valid: false, error: 'Método de pagamento inválido' };
  }

  // Se for cartão de crédito, card_id é obrigatório
  if (obj.payment_method === 'credit_card' && !obj.card_id) {
    return { valid: false, error: 'Cartão é obrigatório para pagamento com cartão de crédito' };
  }

  // Se não for cartão de crédito, account_id é obrigatório
  if (obj.payment_method !== 'credit_card' && !obj.account_id) {
    return { valid: false, error: 'Conta é obrigatória para este método de pagamento' };
  }

  const installments = obj.installments ? Number(obj.installments) : 1;
  if (isNaN(installments) || installments < 1 || installments > 48) {
    return { valid: false, error: 'Número de parcelas deve estar entre 1 e 48' };
  }

  return {
    valid: true,
    data: {
      amount,
      type: obj.type as TransactionCreate['type'],
      payment_method: obj.payment_method as TransactionCreate['payment_method'],
      date: obj.date as string | undefined,
      description: obj.description as string | undefined,
      category_id: obj.category_id as string | undefined,
      account_id: obj.account_id as string | undefined,
      card_id: obj.card_id as string | undefined,
      tags: Array.isArray(obj.tags) ? obj.tags.filter(t => typeof t === 'string') : [],
      installments,
    }
  };
}

// Calcular parcelas com resto na última
function calculateInstallments(total: number, count: number): number[] {
  if (count <= 1) return [total];
  
  const baseAmount = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - baseAmount * count) * 100) / 100;
  
  const amounts: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    amounts.push(baseAmount);
  }
  amounts.push(Math.round((baseAmount + remainder) * 100) / 100);
  
  return amounts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[transactions] ${req.method} request received`)

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
    const transactionId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    // GET - Listar transações com filtros
    if (req.method === 'GET') {
      const startDate = url.searchParams.get('start_date')
      const endDate = url.searchParams.get('end_date')
      const type = url.searchParams.get('type')
      const categoryId = url.searchParams.get('category_id')
      const accountId = url.searchParams.get('account_id')
      const cardId = url.searchParams.get('card_id')
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const includeDeleted = url.searchParams.get('include_deleted') === 'true'

      if (transactionId && transactionId !== 'transactions') {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, categories(*), accounts(*), cards(*)')
          .eq('id', transactionId)
          .eq('user_id', userId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Transação não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let query = supabase
        .from('transactions')
        .select('*, categories(*), accounts(*), cards(*)', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }
      if (type && ['expense', 'income'].includes(type)) {
        query = query.eq('type', type)
      }
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }
      if (accountId) {
        query = query.eq('account_id', accountId)
      }
      if (cardId) {
        query = query.eq('card_id', cardId)
      }

      const { data, error, count } = await query

      if (error) {
        console.log('[transactions] Error listing:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao listar transações' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data, total: count, limit, offset }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - Criar transação
    if (req.method === 'POST') {
      const body = await req.json()
      const validation = validateTransactionCreate(body)

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const txData = validation.data!
      const transactionDate = txData.date ? new Date(txData.date) : new Date()
      const transactionDateStr = transactionDate.toISOString().split('T')[0]
      let invoiceId: string | null = null

      // Se for cartão de crédito, usar função SQL para encontrar/criar fatura correta
      if (txData.payment_method === 'credit_card' && txData.card_id) {
        console.log(`[transactions] Credit card payment - finding invoice for date ${transactionDateStr}`)
        
        // Usar a função SQL find_or_create_invoice para obter a fatura correta
        const { data: invoiceIdResult, error: invoiceError } = await supabase
          .rpc('find_or_create_invoice', {
            p_card_id: txData.card_id,
            p_user_id: userId,
            p_transaction_date: transactionDateStr
          })

        if (invoiceError) {
          console.error('[transactions] Error finding/creating invoice:', invoiceError.message)
          return new Response(
            JSON.stringify({ error: 'Erro ao encontrar/criar fatura' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        invoiceId = invoiceIdResult
        console.log(`[transactions] Using invoice ${invoiceId}`)

        // Se tiver parcelas > 1, criar InstallmentGroup e Installments
        if (txData.installments && txData.installments > 1) {
          // Primeiro criar a transação principal (sem invoice_id direto)
          const { data: newTransaction, error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              amount: txData.amount,
              type: txData.type,
              payment_method: txData.payment_method,
              date: transactionDateStr,
              description: txData.description,
              category_id: txData.category_id,
              card_id: txData.card_id,
              invoice_id: null, // Transação principal não tem invoice_id - parcelas têm
              tags: txData.tags || [],
            })
            .select()
            .single()

          if (txError) {
            console.error('[transactions] Error creating transaction:', txError.message)
            return new Response(
              JSON.stringify({ error: 'Erro ao criar transação' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Criar InstallmentGroup
          const { data: group, error: groupError } = await supabase
            .from('installment_groups')
            .insert({
              user_id: userId,
              transaction_id: newTransaction.id,
              total_amount: txData.amount,
              total_installments: txData.installments,
            })
            .select()
            .single()

          if (groupError) {
            console.error('[transactions] Error creating installment group:', groupError.message)
            return new Response(
              JSON.stringify({ error: 'Erro ao criar grupo de parcelas' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Calcular valores das parcelas
          const installmentAmounts = calculateInstallments(txData.amount, txData.installments)

          // Criar cada parcela com sua fatura correta
          const installments = []
          let currentDate = new Date(transactionDate)

          for (let i = 0; i < txData.installments; i++) {
            const installmentDateStr = currentDate.toISOString().split('T')[0]
            
            // Usar função SQL para encontrar/criar fatura para esta parcela
            const { data: instInvoiceId, error: instInvoiceError } = await supabase
              .rpc('find_or_create_invoice', {
                p_card_id: txData.card_id,
                p_user_id: userId,
                p_transaction_date: installmentDateStr
              })

            if (instInvoiceError) {
              console.error(`[transactions] Error finding invoice for installment ${i + 1}:`, instInvoiceError.message)
            }

            // Buscar due_date da fatura
            const { data: invoiceData } = await supabase
              .from('invoices')
              .select('due_date')
              .eq('id', instInvoiceId)
              .single()

            installments.push({
              group_id: group.id,
              installment_number: i + 1,
              amount: installmentAmounts[i],
              due_date: invoiceData?.due_date || installmentDateStr,
              invoice_id: instInvoiceId,
              status: 'pending',
            })

            // Avançar para o próximo mês
            currentDate.setMonth(currentDate.getMonth() + 1)
          }

          const { error: instError } = await supabase
            .from('installments')
            .insert(installments)

          if (instError) {
            console.error('[transactions] Error creating installments:', instError.message)
          }

          console.log(`[transactions] Created transaction ${newTransaction.id} with ${txData.installments} installments`)
          
          return new Response(
            JSON.stringify({ 
              ...newTransaction, 
              installment_group: group,
              installments_created: txData.installments 
            }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Transação simples (sem parcelamento ou não é cartão)
      const { data: newTransaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: txData.amount,
          type: txData.type,
          payment_method: txData.payment_method,
          date: transactionDateStr,
          description: txData.description,
          category_id: txData.category_id,
          account_id: txData.account_id,
          card_id: txData.card_id,
          invoice_id: invoiceId,
          tags: txData.tags || [],
        })
        .select('*, categories(*), accounts(*), cards(*)')
        .single()

      if (txError) {
        console.error('[transactions] Error creating transaction:', txError.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar transação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[transactions] Created transaction ${newTransaction.id}`)
      
      return new Response(
        JSON.stringify(newTransaction),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT - Atualizar transação
    if (req.method === 'PUT') {
      if (!transactionId || transactionId === 'transactions') {
        return new Response(
          JSON.stringify({ error: 'ID da transação é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (body.amount !== undefined) {
        const amount = Number(body.amount)
        if (isNaN(amount) || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Valor deve ser maior que zero' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.amount = amount
      }

      if (body.description !== undefined) {
        updates.description = body.description
      }

      if (body.category_id !== undefined) {
        updates.category_id = body.category_id
      }

      if (body.date !== undefined) {
        updates.date = body.date
      }

      if (body.tags !== undefined && Array.isArray(body.tags)) {
        updates.tags = body.tags.filter((t: unknown) => typeof t === 'string')
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum campo para atualizar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select('*, categories(*), accounts(*), cards(*)')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar transação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - Soft delete
    if (req.method === 'DELETE') {
      if (!transactionId || transactionId === 'transactions') {
        return new Response(
          JSON.stringify({ error: 'ID da transação é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir transação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Transação excluída com sucesso', data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH - Restaurar transação
    if (req.method === 'PATCH') {
      if (!transactionId || transactionId === 'transactions') {
        return new Response(
          JSON.stringify({ error: 'ID da transação é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .eq('id', transactionId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao restaurar transação' }),
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
    console.error('[transactions] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})