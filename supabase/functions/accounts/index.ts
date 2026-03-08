import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Tipos
interface AccountCreate {
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'benefit_card' | 'investment';
  initial_balance?: number;
  include_in_net_worth?: boolean;
  track_balance?: boolean;
}

interface AccountUpdate {
  name?: string;
  type?: 'checking' | 'savings' | 'cash' | 'benefit_card' | 'investment';
  include_in_net_worth?: boolean;
  track_balance?: boolean;
}

// Validação
function validateAccountCreate(data: unknown): { valid: boolean; error?: string; data?: AccountCreate } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dados inválidos' };
  }

  const obj = data as Record<string, unknown>;
  
  if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length < 2) {
    return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }

  const validTypes = ['checking', 'savings', 'cash', 'benefit_card', 'investment'];
  if (!obj.type || !validTypes.includes(obj.type as string)) {
    return { valid: false, error: 'Tipo de conta inválido' };
  }

  const initialBalance = obj.initial_balance !== undefined ? Number(obj.initial_balance) : 0;
  if (isNaN(initialBalance)) {
    return { valid: false, error: 'Saldo inicial inválido' };
  }

  return {
    valid: true,
    data: {
      name: obj.name.trim(),
      type: obj.type as AccountCreate['type'],
      initial_balance: initialBalance,
      include_in_net_worth: obj.include_in_net_worth !== false,
      track_balance: obj.track_balance !== false,
    }
  };
}

serve(async (req) => {
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[accounts] ${req.method} request received`)

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[accounts] Missing or invalid authorization header')
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
      console.log('[accounts] Invalid token:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    console.log(`[accounts] Authenticated user: ${userId}`)

    // Rate limiting: 60 req/min
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId,
      p_endpoint: 'accounts',
      p_max_requests: 60,
      p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const accountId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null

    // GET - Listar contas ou buscar uma específica
    if (req.method === 'GET') {
      const includeDeleted = url.searchParams.get('include_deleted') === 'true'
      
      if (accountId && accountId !== 'accounts') {
        // Buscar conta específica
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', userId)
          .single()

        if (error) {
          console.log('[accounts] Error fetching account:', error.message)
          return new Response(
            JSON.stringify({ error: 'Conta não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Listar todas as contas
      let query = supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {
        console.log('[accounts] Error listing accounts:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao listar contas' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - Criar conta
    if (req.method === 'POST') {
      const body = await req.json()
      const validation = validateAccountCreate(body)

      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const accountData = validation.data!
      
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: accountData.name,
          type: accountData.type,
          initial_balance: accountData.initial_balance,
          current_balance: accountData.initial_balance,
          include_in_net_worth: accountData.include_in_net_worth,
          track_balance: accountData.track_balance,
        })
        .select()
        .single()

      if (error) {
        console.log('[accounts] Error creating account:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[accounts] Account created:', data.id)
      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT - Atualizar conta
    if (req.method === 'PUT') {
      if (!accountId || accountId === 'accounts') {
        return new Response(
          JSON.stringify({ error: 'ID da conta é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json() as AccountUpdate
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

      if (body.type !== undefined) {
        const validTypes = ['checking', 'savings', 'cash', 'benefit_card', 'investment']
        if (!validTypes.includes(body.type)) {
          return new Response(
            JSON.stringify({ error: 'Tipo de conta inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updates.type = body.type
      }

      if (body.include_in_net_worth !== undefined) {
        updates.include_in_net_worth = Boolean(body.include_in_net_worth)
      }

      if (body.track_balance !== undefined) {
        updates.track_balance = Boolean(body.track_balance)
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum campo para atualizar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.log('[accounts] Error updating account:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[accounts] Account updated:', accountId)
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - Soft delete
    if (req.method === 'DELETE') {
      if (!accountId || accountId === 'accounts') {
        return new Response(
          JSON.stringify({ error: 'ID da conta é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.log('[accounts] Error deleting account:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[accounts] Account soft-deleted:', accountId)
      return new Response(
        JSON.stringify({ message: 'Conta excluída com sucesso', data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH - Restaurar conta
    if (req.method === 'PATCH') {
      if (!accountId || accountId === 'accounts') {
        return new Response(
          JSON.stringify({ error: 'ID da conta é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({ deleted_at: null })
        .eq('id', accountId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.log('[accounts] Error restoring account:', error.message)
        return new Response(
          JSON.stringify({ error: 'Erro ao restaurar conta' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[accounts] Account restored:', accountId)
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
    console.error('[accounts] Internal error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
