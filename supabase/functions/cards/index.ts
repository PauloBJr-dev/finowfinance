import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tipos
interface CardCreate {
  name: string;
  credit_limit: number;
  billing_day: number;
  due_day: number;
}

interface CardUpdate {
  name?: string;
  credit_limit?: number;
  billing_day?: number;
  due_day?: number;
}

// Utilitários para gerar faturas
function generateInvoicePeriods(billingDay: number, dueDay: number, count: number) {
  const periods = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const referenceDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    
    // Data de fechamento do mês anterior
    const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), billingDay + 1);
    
    // Data de fechamento deste mês
    const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), billingDay);
    
    // Data de vencimento
    const dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), dueDay);
    
    periods.push({
      referenceMonth: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
      startDate,
      endDate,
      dueDate
    });
  }
  
  return periods;
}

// Validação
function validateCardCreate(data: unknown): { valid: boolean; error?: string; data?: CardCreate } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const obj = data as Record<string, unknown>;
  
  if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length < 2) {
    return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }

  const creditLimit = Number(obj.credit_limit);
  if (isNaN(creditLimit) || creditLimit <= 0) {
    return { valid: false, error: 'Limite de crédito deve ser maior que zero' };
  }

  const billingDay = Number(obj.billing_day);
  if (isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
    return { valid: false, error: 'Dia de fechamento deve estar entre 1 e 31' };
  }

  const dueDay = Number(obj.due_day);
  if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
    return { valid: false, error: 'Dia de vencimento deve estar entre 1 e 31' };
  }

  return {
    valid: true,
    data: {
      name: obj.name.trim(),
      credit_limit: creditLimit,
      billing_day: billingDay,
      due_day: dueDay,
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[cards] ${req.method} request received`)

  try {
    // Auth validation
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
    console.log(`[cards] Authenticated user: ${userId}`)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const cardId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    // GET - Listar cartões ou buscar um específico
    if (req.method === 'GET') {
      const includeDeleted = url.searchParams.get('include_deleted') === 'true'
      
      if (cardId && cardId !== 'cards') {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('id', cardId)
          .eq('user_id', userId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Cartão não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let query = supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao listar cartões' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - Criar cartão com faturas automáticas
    if (req.method === 'POST') {
      const body = await req.json()
      const validation = validateCardCreate(body)

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const cardData = validation.data!
      
      // 1. Criar cartão
      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert({
          user_id: userId,
          name: cardData.name,
          credit_limit: cardData.credit_limit,
          billing_day: cardData.billing_day,
          due_day: cardData.due_day,
        })
        .select()
        .single()

      if (cardError) {
        console.log('[cards] Error creating card:', cardError.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar cartão' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Gerar faturas automáticas (mês atual + próximo)
      const periods = generateInvoicePeriods(cardData.billing_day, cardData.due_day, 2)
      
      const invoices = periods.map((period) => ({
        card_id: newCard.id,
        user_id: userId,
        reference_month: period.referenceMonth.toISOString().split('T')[0],
        start_date: period.startDate.toISOString().split('T')[0],
        end_date: period.endDate.toISOString().split('T')[0],
        due_date: period.dueDate.toISOString().split('T')[0],
        status: 'open' as const,
        total_amount: 0,
      }))

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoices)

      if (invoiceError) {
        console.error('[cards] Error creating invoices:', invoiceError.message)
        // Não bloqueia a criação do cartão
      } else {
        console.log(`[cards] Created ${invoices.length} invoices for card ${newCard.id}`)
      }

      return new Response(
        JSON.stringify(newCard),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT - Atualizar cartão
    if (req.method === 'PUT') {
      if (!cardId || cardId === 'cards') {
        return new Response(
          JSON.stringify({ error: 'ID do cartão é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json() as CardUpdate
      const updates: Record<string, unknown> = {}

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || body.name.trim().length < 2) {
          return new Response(
            JSON.stringify({ error: 'Nome deve ter pelo menos 2 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.name = body.name.trim()
      }

      if (body.credit_limit !== undefined) {
        const limit = Number(body.credit_limit)
        if (isNaN(limit) || limit <= 0) {
          return new Response(
            JSON.stringify({ error: 'Limite de crédito deve ser maior que zero' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.credit_limit = limit
      }

      if (body.billing_day !== undefined) {
        const day = Number(body.billing_day)
        if (isNaN(day) || day < 1 || day > 31) {
          return new Response(
            JSON.stringify({ error: 'Dia de fechamento deve estar entre 1 e 31' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.billing_day = day
      }

      if (body.due_day !== undefined) {
        const day = Number(body.due_day)
        if (isNaN(day) || day < 1 || day > 31) {
          return new Response(
            JSON.stringify({ error: 'Dia de vencimento deve estar entre 1 e 31' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.due_day = day
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum campo para atualizar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar cartão' }),
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
      if (!cardId || cardId === 'cards') {
        return new Response(
          JSON.stringify({ error: 'ID do cartão é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('cards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir cartão' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Cartão excluído com sucesso', data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH - Restaurar cartão
    if (req.method === 'PATCH') {
      if (!cardId || cardId === 'cards') {
        return new Response(
          JSON.stringify({ error: 'ID do cartão é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('cards')
        .update({ deleted_at: null })
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao restaurar cartão' }),
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
    console.error('[cards] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
