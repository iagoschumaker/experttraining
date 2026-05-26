// ============================================================================
// EXPERT PRO TRAINING — MENSALIDADES API
// ============================================================================
// GET  /api/studio/financeiro/mensalidades — Listar alunos com status de mensalidade
// POST /api/studio/financeiro/mensalidades — Criar mensalidade para um aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { parseLocalDate } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    // Auto-OVERDUE: marcar lançamentos PENDING com dueDate vencido
    await prisma.financialEntry.updateMany({
      where: {
        studioId,
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    })

    // Buscar todos os clientes do studio
    const clients = await prisma.client.findMany({
      where: { studioId, isActive: true },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    })

    // Buscar todos os lançamentos de RECEITA vinculados a clientes
    const entries = await prisma.financialEntry.findMany({
      where: {
        studioId,
        clientId: { not: null },
        type: 'RECEITA',
        status: { not: 'CANCELED' },
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Agrupar lançamentos por cliente
    const entriesByClient: Record<string, typeof entries> = {}
    for (const entry of entries) {
      const cid = entry.clientId!
      if (!entriesByClient[cid]) entriesByClient[cid] = []
      entriesByClient[cid].push(entry)
    }

    // Montar resultado por cliente
    const clientsWithStatus = clients.map(client => {
      const clientEntries = entriesByClient[client.id] || []

      if (clientEntries.length === 0) {
        return {
          ...client,
          status: 'SEM_MENSALIDADE',
          creditMonths: 0,
          totalPending: 0,
          totalOverdue: 0,
          nextDueDate: null,
          lastPaymentDate: null,
          currentMonthPaid: false,
          recurrenceId: null,
          entries: [],
        }
      }

      // Calcular totais
      const pendingEntries = clientEntries.filter(e => e.status === 'PENDING')
      const overdueEntries = clientEntries.filter(e => e.status === 'OVERDUE')
      const paidEntries = clientEntries.filter(e => e.status === 'PAID')

      const totalPending = pendingEntries.reduce((s, e) => s + parseFloat(e.amount.toString()), 0)
      const totalOverdue = overdueEntries.reduce((s, e) => s + parseFloat(e.amount.toString()), 0)

      // Verifica se o mês atual está pago
      const currentMonthPaid = paidEntries.some(e => {
        const d = new Date(e.date)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return monthKey === currentMonth
      })

      // Próximo vencimento: menor data dentre PENDING e OVERDUE
      const unpaidEntries = [...pendingEntries, ...overdueEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      const nextDueDate = unpaidEntries[0]?.dueDate ?? unpaidEntries[0]?.date ?? null

      // Último pagamento
      const lastPaid = paidEntries.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      const lastPaymentDate = lastPaid?.paidAt ?? lastPaid?.date ?? null

      // Meses de crédito: quantas parcelas PAID têm data futura (acima do mês atual)
      const creditMonths = paidEntries.filter(e => {
        const d = new Date(e.date)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return monthKey > currentMonth
      }).length

      // Status geral
      let status: string
      if (overdueEntries.length > 0) {
        status = 'INADIMPLENTE'
      } else if (creditMonths >= 2) {
        status = 'ADIANTADO'
      } else if (currentMonthPaid) {
        status = 'ADIMPLENTE'
      } else if (pendingEntries.length > 0) {
        status = 'PENDENTE'
      } else {
        status = 'ADIMPLENTE'
      }

      // recurrenceId da mensalidade principal (mais recente)
      const recurrenceId = clientEntries
        .filter(e => e.recurrenceId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.recurrenceId ?? null

      return {
        ...client,
        status,
        creditMonths,
        totalPending,
        totalOverdue,
        nextDueDate,
        lastPaymentDate,
        currentMonthPaid,
        recurrenceId,
        entries: clientEntries.slice(-24).map(e => ({
          ...e,
          amount: parseFloat(e.amount.toString()),
        })),
      }
    })

    // Estatísticas gerais
    const withMensalidade = clientsWithStatus.filter(c => c.status !== 'SEM_MENSALIDADE')
    const stats = {
      total: clients.length,
      comMensalidade: withMensalidade.length,
      adimplentes: withMensalidade.filter(c => c.status === 'ADIMPLENTE' || c.status === 'ADIANTADO').length,
      inadimplentes: withMensalidade.filter(c => c.status === 'INADIMPLENTE').length,
      pendentes: withMensalidade.filter(c => c.status === 'PENDENTE').length,
      adiantados: withMensalidade.filter(c => c.status === 'ADIANTADO').length,
      totalAReceber: withMensalidade.reduce((s, c) => s + c.totalPending + c.totalOverdue, 0),
      totalOverdue: withMensalidade.reduce((s, c) => s + c.totalOverdue, 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        clients: clientsWithStatus,
        stats,
      },
    })
  } catch (error) {
    console.error('Mensalidades GET error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar mensalidades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, userId } = auth

  try {
    const body = await request.json()
    const {
      clientId,
      categoryId,
      description,
      amount,
      startDate,
      monthsTotal,    // total de meses da recorrência
      monthsPaidNow,  // quantos meses já foram pagos agora (antecipado)
      paymentMethod,
      notes,
    } = body

    if (!clientId || !categoryId || !description || !amount || !startDate || !monthsTotal) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: clientId, categoryId, description, amount, startDate, monthsTotal' },
        { status: 400 }
      )
    }

    // Verificar que o cliente pertence ao studio
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
    })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado' }, { status: 404 })
    }

    const recurrenceId = `REC-MENS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const parsedAmount = parseFloat(amount)
    const paidCount = Math.min(parseInt(monthsPaidNow) || 0, parseInt(monthsTotal))
    const total = parseInt(monthsTotal)
    const start = parseLocalDate(startDate)
    const now = new Date()

    const entries = []

    for (let i = 0; i < total; i++) {
      const entryDate = new Date(start)
      entryDate.setMonth(entryDate.getMonth() + i)

      const isPaid = i < paidCount
      const status = isPaid ? 'PAID' : 'PENDING'

      const entry = await prisma.financialEntry.create({
        data: {
          studioId,
          categoryId,
          clientId,
          type: 'RECEITA',
          description: `${description} (${i + 1}/${total})`,
          amount: parsedAmount,
          date: entryDate,
          dueDate: entryDate,
          status,
          paidAt: isPaid ? now : null,
          paymentMethod: isPaid && paymentMethod ? (paymentMethod as any) : null,
          recurrenceId,
          installment: i + 1,
          totalInstallments: total,
          notes: notes || null,
          createdById: userId,
        } as any,
        include: {
          category: { select: { id: true, code: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      })

      entries.push({ ...entry, amount: parseFloat(entry.amount.toString()) })
    }

    return NextResponse.json({
      success: true,
      data: entries,
      message: `${total} mensalidades criadas${paidCount > 0 ? `, ${paidCount} já pagas` : ''}`,
    }, { status: 201 })
  } catch (error) {
    console.error('Mensalidades POST error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar mensalidade' }, { status: 500 })
  }
}
