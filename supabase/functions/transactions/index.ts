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

// Utilitários para faturas
function generateInvoicePeriod(billingDay: number, dueDay: number, targetDate: Date) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // Data de fechamento deste mês
  const closingDate = new Date(year, month, billingDay);
  
  // Se a data alvo é antes do fechamento, pertence à fatura atual
  // Se é depois, pertence à próxima fatura
  let referenceMonth: Date;
  if (targetDate <= closingDate) {
    referenceMonth = new Date(year, month, 1);
  } else {
    referenceMonth = new Date(year, month + 1, 1);
  }
  
  const refYear = referenceMonth.getFullYear();
  const refMonth = referenceMonth.getMonth();
  
  // Período da fatura
  const prevMonth = new Date(refYear, refMonth - 1, 1);
  const startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), billingDay + 1);
  const endDate = new Date(refYear, refMonth, billingDay);
  const dueDateObj = new Date(refYear, refMonth, dueDay);
  
  return {
    referenceMonth: referenceMonth.toISOString().split('T')[0],
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dueDate: dueDateObj.toISOString().split('T')[0],
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
      let invoiceId: string | null = null

      // Se for cartão de crédito, encontrar/criar fatura
      if (txData.payment_method === 'credit_card' && txData.card_id) {
        // Buscar cartão para obter billing_day e due_day
        const { data: card, error: cardError } = await supabase
          .from('cards')
          .select('*')
          .eq('id', txData.card_id)
          .eq('user_id', userId)
          .single()

        if (cardError || !card) {
          return new Response(
            JSON.stringify({ error: 'Cartão não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calcular período da fatura
        const period = generateInvoicePeriod(card.billing_day, card.due_day, transactionDate)

        // Buscar fatura existente
        let { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('card_id', txData.card_id)
          .eq('reference_month', period.referenceMonth)
          .single()

        // Se não existe ou está fechada/paga, buscar próxima ou criar
        if (!invoice || invoice.status === 'closed' || invoice.status === 'paid') {
          // Buscar próxima fatura aberta
          const { data: nextInvoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('card_id', txData.card_id)
            .eq('status', 'open')
            .gt('reference_month', period.referenceMonth)
            .order('reference_month', { ascending: true })
            .limit(1)
            .single()

          if (nextInvoice) {
            invoice = nextInvoice
          } else {
            // Criar nova fatura para o próximo mês
            const nextMonth = new Date(transactionDate)
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            const nextPeriod = generateInvoicePeriod(card.billing_day, card.due_day, nextMonth)

            const { data: newInvoice, error: createError } = await supabase
              .from('invoices')
              .insert({
                card_id: txData.card_id,
                user_id: userId,
                reference_month: nextPeriod.referenceMonth,
                start_date: nextPeriod.startDate,
                end_date: nextPeriod.endDate,
                due_date: nextPeriod.dueDate,
                status: 'open',
                total_amount: 0,
              })
              .select()
              .single()

            if (createError) {
              console.error('[transactions] Error creating invoice:', createError.message)
              return new Response(
                JSON.stringify({ error: 'Erro ao criar fatura' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }

            invoice = newInvoice
          }
        }

        invoiceId = invoice.id

        // Se tiver parcelas > 1, criar InstallmentGroup e Installments
        if (txData.installments && txData.installments > 1) {
          // Primeiro criar a transação principal
          const { data: newTransaction, error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              amount: txData.amount,
              type: txData.type,
              payment_method: txData.payment_method,
              date: transactionDate.toISOString().split('T')[0],
              description: txData.description,
              category_id: txData.category_id,
              card_id: txData.card_id,
              invoice_id: null, // Transação principal não tem invoice_id diretamente
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

          // Criar cada parcela e encontrar/criar fatura correspondente
          const installments = []
          let currentDate = new Date(transactionDate)

          for (let i = 0; i < txData.installments; i++) {
            const period = generateInvoicePeriod(card.billing_day, card.due_day, currentDate)
            
            // Buscar ou criar fatura para esta parcela
            let { data: instInvoice } = await supabase
              .from('invoices')
              .select('*')
              .eq('card_id', txData.card_id)
              .eq('reference_month', period.referenceMonth)
              .single()

            if (!instInvoice || instInvoice.status === 'closed' || instInvoice.status === 'paid') {
              // Buscar próxima aberta ou criar
              const { data: nextOpen } = await supabase
                .from('invoices')
                .select('*')
                .eq('card_id', txData.card_id)
                .eq('status', 'open')
                .gte('reference_month', period.referenceMonth)
                .order('reference_month', { ascending: true })
                .limit(1)
                .single()

              if (nextOpen) {
                instInvoice = nextOpen
              } else {
                const { data: newInv } = await supabase
                  .from('invoices')
                  .insert({
                    card_id: txData.card_id,
                    user_id: userId,
                    reference_month: period.referenceMonth,
                    start_date: period.startDate,
                    end_date: period.endDate,
                    due_date: period.dueDate,
                    status: 'open',
                    total_amount: 0,
                  })
                  .select()
                  .single()
                instInvoice = newInv
              }
            }

            installments.push({
              group_id: group.id,
              installment_number: i + 1,
              amount: installmentAmounts[i],
              due_date: period.dueDate,
              invoice_id: instInvoice?.id,
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
          date: transactionDate.toISOString().split('T')[0],
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
