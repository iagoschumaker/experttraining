// ============================================================================
// EXPERT PRO TRAINING — STUDIO UNITS API
// ============================================================================
// GET  /api/studio/units — Listar unidades
// POST /api/studio/units — Criar unidade
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const units = await prisma.studioUnit.findMany({
      where: { studioId: auth.studioId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: units })
  } catch (error) {
    console.error('Units error:', error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { name, isMain } = await request.json()

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nome obrigatório' },
        { status: 400 }
      )
    }

    // Se marcada como principal, desmarcar as outras
    if (isMain) {
      await prisma.studioUnit.updateMany({
        where: { studioId: auth.studioId, isMain: true },
        data: { isMain: false },
      })
    }

    const unit = await prisma.studioUnit.create({
      data: {
        studioId: auth.studioId,
        name,
        isMain: isMain || false,
      },
    })

    return NextResponse.json({ success: true, data: unit }, { status: 201 })
  } catch (error) {
    console.error('Create unit error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar unidade' }, { status: 500 })
  }
}
