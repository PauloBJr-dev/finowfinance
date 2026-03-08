import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Design system colors
const PRIMARY = [31, 122, 99] as const    // #1F7A63
const TEXT = [28, 31, 30] as const        // #1C1F1E
const MUTED = [120, 130, 126] as const    // #78827E
const BG_LIGHT = [247, 248, 246] as const // #F7F8F6

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = user.id

    // Rate limiting
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: userId, p_endpoint: 'reports', p_max_requests: 10, p_window_seconds: 60
    })
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate e endDate são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()

    // Fetch transactions with categories
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, type, date, description, category_id, categories(name, color)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (txError) {
      console.error('[reports] Query error:', txError)
      return new Response(JSON.stringify({ error: 'Erro ao buscar transações' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Aggregate by category
    const expensesByCategory: Record<string, { name: string; total: number }> = {}
    const incomeByCategory: Record<string, { name: string; total: number }> = {}
    let totalExpenses = 0
    let totalIncome = 0

    for (const tx of (transactions || [])) {
      const catName = (tx.categories as any)?.name || 'Sem categoria'
      if (tx.type === 'expense') {
        totalExpenses += Number(tx.amount)
        if (!expensesByCategory[catName]) expensesByCategory[catName] = { name: catName, total: 0 }
        expensesByCategory[catName].total += Number(tx.amount)
      } else {
        totalIncome += Number(tx.amount)
        if (!incomeByCategory[catName]) incomeByCategory[catName] = { name: catName, total: 0 }
        incomeByCategory[catName].total += Number(tx.amount)
      }
    }

    const expensesList = Object.values(expensesByCategory).sort((a, b) => b.total - a.total)
    const incomeList = Object.values(incomeByCategory).sort((a, b) => b.total - a.total)

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let y = margin

    // --- HEADER ---
    doc.setFillColor(...BG_LIGHT)
    doc.rect(0, 0, pageWidth, 45, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(...PRIMARY)
    doc.text('Finow', margin, y + 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text('Relatório Financeiro', margin, y + 18)

    // User name and period on right
    doc.setFontSize(9)
    doc.setTextColor(...TEXT)
    const userName = profile?.name || 'Usuário'
    doc.text(userName, pageWidth - margin, y + 10, { align: 'right' })
    doc.setTextColor(...MUTED)
    doc.text(`${formatDateBR(startDate)} — ${formatDateBR(endDate)}`, pageWidth - margin, y + 18, { align: 'right' })

    y = 55

    // --- SUMMARY CARDS ---
    const cardWidth = contentWidth / 3 - 4
    const cards = [
      { label: 'Receitas', value: formatBRL(totalIncome), color: [34, 197, 94] as const },
      { label: 'Despesas', value: formatBRL(totalExpenses), color: [239, 68, 68] as const },
      { label: 'Balanço', value: formatBRL(totalIncome - totalExpenses), color: PRIMARY },
    ]

    cards.forEach((card, i) => {
      const x = margin + i * (cardWidth + 6)
      doc.setFillColor(245, 246, 244)
      doc.roundedRect(x, y, cardWidth, 22, 3, 3, 'F')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(card.label, x + 6, y + 8)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...card.color)
      doc.text(card.value, x + 6, y + 17)
      doc.setFont('helvetica', 'normal')
    })

    y += 32

    // --- TABLE HELPER ---
    function drawTable(title: string, items: { name: string; total: number }[], totalAmount: number) {
      // Check if we need a new page
      if (y > 250) {
        doc.addPage()
        y = margin
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PRIMARY)
      doc.text(title, margin, y)
      y += 2

      // Divider
      doc.setDrawColor(...PRIMARY)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      if (items.length === 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...MUTED)
        doc.text('Nenhum registro no período', margin, y)
        y += 10
        return
      }

      // Table header
      doc.setFillColor(...BG_LIGHT)
      doc.rect(margin, y - 4, contentWidth, 8, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT)
      doc.text('Categoria', margin + 4, y)
      doc.text('Valor', pageWidth - margin - 30, y, { align: 'right' })
      doc.text('%', pageWidth - margin - 4, y, { align: 'right' })
      y += 6

      // Rows
      doc.setFont('helvetica', 'normal')
      items.forEach((item, i) => {
        if (y > 275) {
          doc.addPage()
          y = margin
        }

        if (i % 2 === 0) {
          doc.setFillColor(250, 251, 249)
          doc.rect(margin, y - 4, contentWidth, 7, 'F')
        }

        const pct = totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : '0.0'
        doc.setFontSize(9)
        doc.setTextColor(...TEXT)
        doc.text(item.name, margin + 4, y)
        doc.text(formatBRL(item.total), pageWidth - margin - 30, y, { align: 'right' })
        doc.setTextColor(...MUTED)
        doc.text(`${pct}%`, pageWidth - margin - 4, y, { align: 'right' })
        y += 7
      })

      // Total row
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y - 2, pageWidth - margin, y - 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      doc.text('Total', margin + 4, y + 3)
      doc.text(formatBRL(totalAmount), pageWidth - margin - 30, y + 3, { align: 'right' })
      y += 14
    }

    drawTable('Despesas por Categoria', expensesList, totalExpenses)
    drawTable('Receitas por Categoria', incomeList, totalIncome)

    // --- FOOTER ---
    const footerY = doc.internal.pageSize.getHeight() - 10
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(
      `Gerado em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())} · Finow`,
      pageWidth / 2, footerY, { align: 'center' }
    )

    // Output PDF
    const pdfOutput = doc.output('arraybuffer')

    return new Response(pdfOutput, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="finow-relatorio-${startDate}-${endDate}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[reports] Internal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
