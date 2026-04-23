// ============================================================================
// EXPERT PRO TRAINING — FINANCIAL ENTRIES API
// ============================================================================
// GET  /api/studio/financeiro/entries — Listar lançamentos (com filtros)
// POST /api/studio/financeiro/entries — Criar lançamento
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const { searchParams } = new URL(request.url)

  // Filtros
  const type = searchParams.get('type') // RECEITA | DESPESA
  const status = searchParams.get('status') // PENDING | PAID | OVERDUE | CANCELED
  const categoryId = searchParams.get('categoryId')
  const clientId = searchParams.get('clientId')
  const unitId = searchParams.get('unitId')
  const paymentMethod = searchParams.get('paymentMethod')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const where: any = { studioId }

    if (type) where.type = type
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (clientId) where.clientId = clientId
    if (unitId) where.unitId = unitId
    if (paymentMethod) where.paymentMethod = paymentMethod

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const [entries, total] = await Promise.all([
      prisma.financialEntry.findMany({
        where,
        include: {
          category: { select: { id: true, code: true, name: true, type: true } },
          client: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialEntry.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        entries: entries.map(e => ({
          ...e,
          amount: parseFloat(e.amount.toString()),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Financial entries error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar lançamentos' },
      { status: 500 }
    )
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
      categoryId, type, description, amount, date, dueDate,
      paymentMethod, clientId, unitId, notes,
      installments, // Para parcelamento: { total: 3, startDate: '2026-05-01' }
    } = body

    if (!categoryId || !type || !description || !amount || !date) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: categoryId, type, description, amount, date' },
        { status: 400 }
      )
    }

    // Se parcelado, criar múltiplos lançamentos
    if (installments && installments.total > 1) {
      const recurrenceId = `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const installmentAmount = parseFloat(amount) / installments.total
      const startDate = new Date(installments.startDate || date)
      const entries = []

      for (let i = 0; i < installments.total; i++) {
        const installmentDate = new Date(startDate)
        installmentDate.setMonth(installmentDate.getMonth() + i)

        const entry = await prisma.financialEntry.create({
          data: {
            studioId,
            categoryId,
            clientId: clientId || null,
            unitId: unitId || null,
            type,
            description: `${description} (${i + 1}/${installments.total})`,
            amount: installmentAmount,
            date: installmentDate,
            dueDate: installmentDate,
            status: 'PENDING',
            paymentMethod: paymentMethod || null,
            recurrenceId,
            installment: i + 1,
            totalInstallments: installments.total,
            notes,
            createdById: userId,
          } as any,
          include: {
            category: { select: { id: true, code: true, name: true } },
          },
        })
        entries.push(entry)
      }

      return NextResponse.json({
        success: true,
        data: entries.map(e => ({ ...e, amount: parseFloat(e.amount.toString()) })),
        message: `${installments.total} parcelas criadas`,
      }, { status: 201 })
    }

    // Lançamento simples
    const status = body.status || (dueDate && new Date(dueDate) > new Date() ? 'PENDING' : 'PENDING')
    const paidAt = body.paidAt || (paymentMethod ? new Date() : null)
    const finalStatus = paidAt ? 'PAID' : status

    const entry = await prisma.financialEntry.create({
      data: {
        studioId,
        categoryId,
        clientId: clientId || null,
        unitId: unitId || null,
        type,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        status: finalStatus,
        paymentMethod: paymentMethod || null,
        notes,
        createdById: userId,
      } as any,
      include: {
        category: { select: { id: true, code: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
    }, { status: 201 })
  } catch (error) {
    console.error('Create entry error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar lançamento' },
      { status: 500 }
    )
  }
}
