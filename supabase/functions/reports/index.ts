import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { jsPDF } from "https://esm.sh/jspdf@2.5.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Design system colors
const PRIMARY = [31, 122, 99] as const
const TEXT = [28, 31, 30] as const
const MUTED = [120, 130, 126] as const
const BG_LIGHT = [247, 248, 246] as const
const RED = [239, 68, 68] as const
const GREEN = [34, 197, 94] as const

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

function translatePaymentMethod(method: string): string {
  const map: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit: 'Débito',
    transfer: 'PIX/Transferência',
    cash: 'Dinheiro',
    boleto: 'Boleto',
    voucher: 'Voucher',
    split: 'Misto',
    pix: 'PIX',
  }
  return map[method] || 'Outros'
}

function translateInvoiceStatus(status: string): string {
  const map: Record<string, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    paid: 'Paga',
    overdue: 'Vencida',
  }
  return map[status] || status
}

// Safe accessor for aiData sections
function safeAI(aiData: any): {
  narrative: string | null
  historicalObservation: string | null
  projectionInterpretation: string | null
  scoreAnalysis: { strengths: string[]; improvements: string[]; motivation: string } | null
  historicalMonths: any[]
  projection: any
  score: any
} {
  try {
    return {
      narrative: typeof aiData?.ai?.narrative === 'string' ? aiData.ai.narrative : null,
      historicalObservation: typeof aiData?.ai?.historicalObservation === 'string' ? aiData.ai.historicalObservation : null,
      projectionInterpretation: typeof aiData?.ai?.projectionInterpretation === 'string' ? aiData.ai.projectionInterpretation : null,
      scoreAnalysis: aiData?.ai?.scoreAnalysis && typeof aiData.ai.scoreAnalysis === 'object'
        ? {
            strengths: Array.isArray(aiData.ai.scoreAnalysis.strengths) ? aiData.ai.scoreAnalysis.strengths : [],
            improvements: Array.isArray(aiData.ai.scoreAnalysis.improvements) ? aiData.ai.scoreAnalysis.improvements : [],
            motivation: typeof aiData.ai.scoreAnalysis.motivation === 'string' ? aiData.ai.scoreAnalysis.motivation : '',
          }
        : null,
      historicalMonths: Array.isArray(aiData?.historicalMonths) ? aiData.historicalMonths : [],
      projection: aiData?.projection && typeof aiData.projection === 'object' ? aiData.projection : null,
      score: aiData?.score && typeof aiData.score === 'object' ? aiData.score : null,
    }
  } catch {
    return { narrative: null, historicalObservation: null, projectionInterpretation: null, scoreAnalysis: null, historicalMonths: [], projection: null, score: null }
  }
}

interface CategoryDetail {
  name: string
  total: number
  transactions: { description: string; amount: number; date: string; paymentMethod: string }[]
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
    const { startDate, endDate, includeAI, aiData: rawAiData } = body

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'startDate e endDate são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ai = includeAI ? safeAI(rawAiData) : safeAI(null)

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single()

    // Fetch transactions (expanded query)
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount, type, date, description, payment_method, card_id, invoice_id, category_id, categories(name, color), cards(name)')
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

    // Fetch invoices in period
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, total_amount, closing_date, due_date, status, card_id, cards(name)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('closing_date', startDate)
      .lte('closing_date', endDate)
      .order('closing_date', { ascending: true })

    // === CLASSIFY TRANSACTIONS ===
    const invoicePayments: typeof transactions = []
    const normalTxs: typeof transactions = []

    for (const tx of (transactions || [])) {
      const catName = (tx.categories as any)?.name || ''
      if (catName === 'Pagamento de Fatura') {
        invoicePayments.push(tx)
      } else {
        normalTxs.push(tx)
      }
    }

    // Aggregate by category (excluding invoice payments)
    const expensesByCategory: Record<string, CategoryDetail> = {}
    const incomeByCategory: Record<string, CategoryDetail> = {}
    let totalExpenses = 0
    let totalIncome = 0

    for (const tx of normalTxs) {
      const catName = (tx.categories as any)?.name || 'Sem categoria'
      const txDetail = {
        description: tx.description || 'Sem descrição',
        amount: Number(tx.amount),
        date: tx.date,
        paymentMethod: translatePaymentMethod(tx.payment_method),
      }

      if (tx.type === 'expense') {
        totalExpenses += Number(tx.amount)
        if (!expensesByCategory[catName]) expensesByCategory[catName] = { name: catName, total: 0, transactions: [] }
        expensesByCategory[catName].total += Number(tx.amount)
        expensesByCategory[catName].transactions.push(txDetail)
      } else {
        totalIncome += Number(tx.amount)
        if (!incomeByCategory[catName]) incomeByCategory[catName] = { name: catName, total: 0, transactions: [] }
        incomeByCategory[catName].total += Number(tx.amount)
        incomeByCategory[catName].transactions.push(txDetail)
      }
    }

    const expensesList = Object.values(expensesByCategory).sort((a, b) => b.total - a.total)
    const incomeList = Object.values(incomeByCategory).sort((a, b) => b.total - a.total)

    // Invoice payments total
    let totalInvoicePayments = 0
    for (const tx of invoicePayments) {
      totalInvoicePayments += Number(tx.amount)
    }

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
      { label: 'Receitas', value: formatBRL(totalIncome), color: GREEN },
      { label: 'Despesas', value: formatBRL(totalExpenses), color: RED },
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

    y += 26

    // Disclaimer under Despesas card
    const despesasCardX = margin + 1 * (cardWidth + 6)
    doc.setFontSize(6)
    doc.setTextColor(...MUTED)
    doc.text('* Exclui pagamentos de fatura', despesasCardX + 6, y)

    y += 10

    // --- PAGE BREAK HELPER ---
    function checkPage(needed: number) {
      if (y + needed > 275) {
        doc.addPage()
        y = margin
      }
    }

    // --- SECTION HEADER HELPER ---
    function drawSectionHeader(title: string) {
      checkPage(20)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PRIMARY)
      doc.text(title, margin, y)
      y += 2
      doc.setDrawColor(...PRIMARY)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6
    }

    // --- DETAILED TABLE (categories with transactions) ---
    function drawDetailedTable(title: string, items: CategoryDetail[], totalAmount: number, totalColor: readonly [number, number, number]) {
      drawSectionHeader(title)

      if (items.length === 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...MUTED)
        doc.text('Nenhum registro no período', margin, y)
        y += 10
        return
      }

      for (const cat of items) {
        checkPage(14)

        // Category header row
        doc.setFillColor(240, 243, 241)
        doc.rect(margin, y - 4, contentWidth, 8, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...TEXT)
        doc.text(cat.name, margin + 4, y)
        doc.setTextColor(...totalColor)
        doc.text(formatBRL(cat.total), pageWidth - margin - 4, y, { align: 'right' })
        y += 6

        // Transaction sub-rows
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        for (const tx of cat.transactions) {
          checkPage(6)

          doc.setTextColor(...TEXT)
          // Description (truncated)
          const desc = tx.description.length > 28 ? tx.description.substring(0, 26) + '…' : tx.description
          doc.text(desc, margin + 8, y)

          // Payment method
          doc.setTextColor(...MUTED)
          doc.text(tx.paymentMethod, margin + 68, y)

          // Date
          doc.text(formatDateBR(tx.date), margin + 108, y)

          // Amount
          doc.setTextColor(...TEXT)
          doc.text(formatBRL(tx.amount), pageWidth - margin - 4, y, { align: 'right' })
          y += 5
        }

        y += 3
      }

      // Total row
      checkPage(10)
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y - 2, pageWidth - margin, y - 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      doc.text('Total', margin + 4, y + 3)
      doc.setTextColor(...totalColor)
      doc.text(formatBRL(totalAmount), pageWidth - margin - 4, y + 3, { align: 'right' })
      y += 14
    }

    // === SECTION: Despesas por Categoria (detailed) ===
    drawDetailedTable('Despesas por Categoria', expensesList, totalExpenses, RED)

    // === SECTION: Receitas por Categoria (detailed) ===
    drawDetailedTable('Receitas por Categoria', incomeList, totalIncome, GREEN)

    // === SECTION: Cartões de Crédito ===
    if (invoices && invoices.length > 0) {
      drawSectionHeader('Cartões de Crédito')

      // Group invoices by card
      const invoicesByCard: Record<string, { cardName: string; invoices: typeof invoices }> = {}
      for (const inv of invoices) {
        const cardId = inv.card_id
        const cardName = (inv.cards as any)?.name || 'Cartão'
        if (!invoicesByCard[cardId]) invoicesByCard[cardId] = { cardName, invoices: [] }
        invoicesByCard[cardId].invoices.push(inv)
      }

      for (const [_cardId, group] of Object.entries(invoicesByCard)) {
        checkPage(14)

        // Card name header
        doc.setFillColor(235, 240, 238)
        doc.rect(margin, y - 4, contentWidth, 8, 'F')
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PRIMARY)
        doc.text(group.cardName, margin + 4, y)
        y += 8

        for (const inv of group.invoices) {
          checkPage(12)

          // Invoice header
          const closingDate = new Date(inv.closing_date + 'T12:00:00')
          const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(closingDate)
          const statusLabel = translateInvoiceStatus(inv.status)

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...TEXT)
          doc.text(`Fatura ${monthLabel}`, margin + 6, y)

          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...MUTED)
          doc.text(`— ${statusLabel}`, margin + 6 + doc.getTextWidth(`Fatura ${monthLabel}`) + 2, y)

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...RED)
          doc.text(formatBRL(Number(inv.total_amount)), pageWidth - margin - 4, y, { align: 'right' })
          y += 6

          // Find transactions linked to this invoice
          const invoiceTxs = (transactions || []).filter(tx => tx.invoice_id === inv.id)

          if (invoiceTxs.length === 0) {
            doc.setFontSize(8)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(...MUTED)
            doc.text('Nenhuma transação no período', margin + 10, y)
            y += 6
          } else {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            for (const tx of invoiceTxs) {
              checkPage(6)
              doc.setTextColor(...TEXT)
              const desc = (tx.description || 'Sem descrição')
              const descTrunc = desc.length > 28 ? desc.substring(0, 26) + '…' : desc
              doc.text(descTrunc, margin + 10, y)
              doc.setTextColor(...MUTED)
              doc.text('Cartão de Crédito', margin + 68, y)
              doc.text(formatDateBR(tx.date), margin + 108, y)
              doc.setTextColor(...TEXT)
              doc.text(formatBRL(Number(tx.amount)), pageWidth - margin - 4, y, { align: 'right' })
              y += 5
            }
          }

          y += 4
        }

        y += 4
      }
    }

    // === SECTION: Pagamentos de Fatura ===
    if (invoicePayments.length > 0) {
      drawSectionHeader('Pagamentos de Fatura')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      for (const tx of invoicePayments) {
        checkPage(6)
        doc.setTextColor(...TEXT)
        const desc = (tx.description || 'Pagamento de Fatura')
        const descTrunc = desc.length > 28 ? desc.substring(0, 26) + '…' : desc
        doc.text(descTrunc, margin + 4, y)
        doc.setTextColor(...MUTED)
        doc.text(translatePaymentMethod(tx.payment_method), margin + 68, y)
        doc.text(formatDateBR(tx.date), margin + 108, y)
        doc.setTextColor(...TEXT)
        doc.text(formatBRL(Number(tx.amount)), pageWidth - margin - 4, y, { align: 'right' })
        y += 5
      }

      // Total
      checkPage(10)
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      doc.text('Total', margin + 4, y)
      doc.setTextColor(...MUTED)
      doc.text(formatBRL(totalInvoicePayments), pageWidth - margin - 4, y, { align: 'right' })
      y += 14
    }

    // ========= AI SECTIONS (if includeAI) — UNCHANGED =========
    if (includeAI) {
      const AI_NOTICE = 'Ative o compartilhamento de dados nas configurações para ver esta análise.'

      // Section A: Narrative
      checkPage(30)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PRIMARY)
      doc.text('Narrativa do Mês', margin, y)
      y += 2
      doc.setDrawColor(...PRIMARY)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      if (ai.narrative) {
        doc.setFillColor(245, 250, 248)
        doc.roundedRect(margin, y - 3, contentWidth, 28, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT)
        const narrativeLines = doc.splitTextToSize(ai.narrative, contentWidth - 8)
        doc.text(narrativeLines, margin + 4, y + 2)
        y += Math.max(28, narrativeLines.length * 4 + 6)
      } else {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...MUTED)
        doc.text(AI_NOTICE, margin, y)
        y += 10
      }

      // Section B: Historical comparison table
      checkPage(40)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PRIMARY)
      doc.text('Comparativo Histórico', margin, y)
      y += 2
      doc.setDrawColor(...PRIMARY)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6

      if (ai.historicalMonths.length > 0) {
        doc.setFillColor(...BG_LIGHT)
        doc.rect(margin, y - 4, contentWidth, 8, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...TEXT)
        doc.text('Mês', margin + 4, y)
        doc.text('Despesas', margin + 50, y)
        doc.text('Receitas', margin + 90, y)
        doc.text('Top Categoria', margin + 125, y)
        y += 6

        doc.setFont('helvetica', 'normal')
        for (let i = 0; i < ai.historicalMonths.length; i++) {
          checkPage(8)
          const m = ai.historicalMonths[i]
          if (i % 2 === 0) {
            doc.setFillColor(250, 251, 249)
            doc.rect(margin, y - 4, contentWidth, 7, 'F')
          }
          doc.setFontSize(8)
          doc.setTextColor(...TEXT)
          doc.text(String(m.month || ''), margin + 4, y)
          doc.text(formatBRL(m.expenses || 0), margin + 50, y)
          doc.text(formatBRL(m.income || 0), margin + 90, y)
          doc.setTextColor(...MUTED)
          doc.text(String(m.topCategory || '-'), margin + 125, y)
          y += 7
        }
        y += 4
      }

      if (ai.historicalObservation) {
        checkPage(15)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...MUTED)
        const obsLines = doc.splitTextToSize(ai.historicalObservation, contentWidth - 8)
        doc.text(obsLines, margin + 4, y)
        y += obsLines.length * 4 + 6
      }

      // Section C: Projection
      if (ai.projection) {
        checkPage(35)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PRIMARY)
        doc.text('Projeção Próximo Mês', margin, y)
        y += 2
        doc.setDrawColor(...PRIMARY)
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 6

        const projCards = [
          { label: 'Receitas est.', value: formatBRL(ai.projection.estimatedIncome || 0), color: GREEN },
          { label: 'Despesas est.', value: formatBRL(ai.projection.estimatedExpenses || 0), color: RED },
          { label: 'Saldo est.', value: formatBRL(ai.projection.projectedBalance || 0), color: (ai.projection.projectedBalance || 0) >= 0 ? PRIMARY : RED },
        ]

        projCards.forEach((card, i) => {
          const x = margin + i * (cardWidth + 6)
          doc.setFillColor(245, 246, 244)
          doc.roundedRect(x, y, cardWidth, 18, 2, 2, 'F')
          doc.setFontSize(7)
          doc.setTextColor(...MUTED)
          doc.text(card.label, x + 4, y + 6)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...card.color)
          doc.text(card.value, x + 4, y + 13)
          doc.setFont('helvetica', 'normal')
        })
        y += 24

        if (ai.projectionInterpretation) {
          const projLines = doc.splitTextToSize(ai.projectionInterpretation, contentWidth - 8)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(...MUTED)
          doc.text(projLines, margin + 4, y)
          y += projLines.length * 4 + 4
        }

        doc.setFontSize(7)
        doc.setTextColor(160, 165, 162)
        doc.text('Projeção baseada no seu histórico. Não é garantia de resultado.', margin, y)
        y += 8
      }

      // Section D: Score
      if (ai.score) {
        checkPage(40)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PRIMARY)
        doc.text('Score de Saúde Financeira', margin, y)
        y += 2
        doc.setDrawColor(...PRIMARY)
        doc.setLineWidth(0.5)
        doc.line(margin, y, pageWidth - margin, y)
        y += 8

        const scoreVal = ai.score.value ?? 0
        const scoreLevel = ai.score.level || 'attention'
        const scoreColors: Record<string, readonly [number, number, number]> = {
          excellent: [34, 197, 94],
          good: [234, 179, 8],
          attention: [249, 115, 22],
          critical: [239, 68, 68],
        }
        const scoreLabels: Record<string, string> = {
          excellent: 'Saúde excelente 🟢',
          good: 'Saúde boa 🟡',
          attention: 'Atenção necessária 🟠',
          critical: 'Situação crítica 🔴',
        }

        const sColor = scoreColors[scoreLevel] || scoreColors.attention

        doc.setFillColor(245, 246, 244)
        doc.roundedRect(margin, y, 40, 25, 3, 3, 'F')
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...sColor)
        doc.text(String(scoreVal), margin + 20, y + 13, { align: 'center' })
        doc.setFontSize(7)
        doc.setTextColor(...MUTED)
        doc.text('/100', margin + 20, y + 19, { align: 'center' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...sColor)
        doc.text(scoreLabels[scoreLevel] || '', margin + 48, y + 10)
        y += 30

        if (ai.scoreAnalysis) {
          if (ai.scoreAnalysis.strengths.length > 0) {
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...TEXT)
            doc.text('Pontos fortes:', margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            for (const s of ai.scoreAnalysis.strengths) {
              checkPage(6)
              doc.setFontSize(8)
              doc.setTextColor(34, 197, 94)
              doc.text('✓', margin + 2, y)
              doc.setTextColor(...TEXT)
              const sLines = doc.splitTextToSize(s, contentWidth - 12)
              doc.text(sLines, margin + 8, y)
              y += sLines.length * 4 + 2
            }
          }

          if (ai.scoreAnalysis.improvements.length > 0) {
            y += 2
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...TEXT)
            doc.text('Pontos de melhoria:', margin, y)
            y += 5
            doc.setFont('helvetica', 'normal')
            for (const s of ai.scoreAnalysis.improvements) {
              checkPage(6)
              doc.setFontSize(8)
              doc.setTextColor(249, 115, 22)
              doc.text('!', margin + 2, y)
              doc.setTextColor(...TEXT)
              const sLines = doc.splitTextToSize(s, contentWidth - 12)
              doc.text(sLines, margin + 8, y)
              y += sLines.length * 4 + 2
            }
          }

          if (ai.scoreAnalysis.motivation) {
            y += 3
            checkPage(12)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(...MUTED)
            const motLines = doc.splitTextToSize(`"${ai.scoreAnalysis.motivation}"`, contentWidth - 8)
            doc.text(motLines, margin + 4, y)
            y += motLines.length * 4 + 4
          }
        }
      }
    }

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
        'Content-Disposition': `attachment; filename="Relatorio financeiro ${formatDateBR(startDate)} - ${formatDateBR(endDate)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[reports] Internal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
