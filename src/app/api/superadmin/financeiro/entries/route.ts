// ============================================================================
// EXPERT PRO TRAINING — SUPERADMIN FINANCIAL ENTRIES API
// ============================================================================
// GET/POST /api/superadmin/financeiro/entries
// O SuperAdmin tem seu próprio financeiro — usa studioId especial "SUPERADMIN"
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { parseLocalDate } from '@/lib/date-utils'

const SUPERADMIN_STUDIO_ID = '_SUPERADMIN_'

async function verifySuperAdmin() {
  const token = await getAccessTokenCookie()
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || !payload.isSuperAdmin) return null
  return payload
}

export async function GET(request: NextRequest) {
  const payload = await verifySuperAdmin()
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const page = parseInt(searchParams.get('page') || '1')

  try {
    const where: any = { studioId: SUPERADMIN_STUDIO_ID }
    if (type) where.type = type
    if (status) where.status = status

    const [entries, total] = await Promise.all([
      prisma.financialEntry.findMany({
        where,
        include: {
          category: { select: { id: true, code: true, name: true, type: true } },
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
        entries: entries.map(e => ({ ...e, amount: parseFloat(e.amount.toString()) })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('SA entries error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const payload = await verifySuperAdmin()
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { categoryId, type, description, amount, date, dueDate, paymentMethod, notes } = body

    if (!categoryId || !type || !description || !amount || !date) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const paidAt = body.paidAt ? new Date(body.paidAt) : null
    const finalStatus = paidAt ? 'PAID' : (body.status || 'PENDING')

    const entry = await prisma.financialEntry.create({
      data: {
        studioId: SUPERADMIN_STUDIO_ID,
        categoryId,
        type,
        description,
        amount: parseFloat(amount),
        date: parseLocalDate(date),
        dueDate: dueDate ? parseLocalDate(dueDate) : null,
        paidAt,
        status: finalStatus,
        paymentMethod: paymentMethod || null,
        notes,
        createdById: payload.userId,
      } as any,
      include: { category: { select: { id: true, code: true, name: true } } },
    })

    return NextResponse.json({
      success: true,
      data: { ...entry, amount: parseFloat(entry.amount.toString()) },
    }, { status: 201 })
  } catch (error) {
    console.error('SA create entry error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}
