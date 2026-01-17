// ============================================================================
// EXPERT PRO TRAINING - STUDIO SETTINGS API
// ============================================================================
// GET: Buscar configurações do studio
// PUT: Atualizar configurações do studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// GET /api/studio/settings - Buscar configurações do studio
export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth()
    if ('error' in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: payload.status })
    }

    const studioId = payload.studioId

    // Período atual (mês corrente)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const [studio, totalTrainers, clientsCount, lastUsageRecord, activeTrainersData] = await Promise.all([
      prisma.studio.findUnique({
        where: { id: studioId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          settings: true,
          status: true,
          isPaid: true,
          plan: {
            select: {
              name: true,
              tier: true,
              minTrainers: true,
              recommendedMax: true,
            },
          },
        },
      }),
      // Total de trainers cadastrados (ativos no sistema) - NÃO inclui STUDIO_ADMIN
      prisma.userStudio.count({
        where: {
          studioId: studioId,
          role: 'TRAINER',
          isActive: true,
        },
      }),
      // Total de clientes
      prisma.client.count({
        where: { studioId: studioId },
      }),
      // Último registro de uso (para pegar trainers ativos calculados)
      prisma.usageRecord.findFirst({
        where: { studioId: studioId },
        orderBy: { periodEnd: 'desc' },
        select: {
          activeTrainers: true,
          totalTrainers: true,
          periodStart: true,
          periodEnd: true,
        },
      }),
      // Contar trainers que tiveram atividade no período atual (apenas role TRAINER)
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT active_trainers.trainer_id) as count
        FROM (
          SELECT trainer_id FROM lessons 
          WHERE studio_id = ${studioId} 
          AND started_at >= ${periodStart} AND started_at <= ${periodEnd}
          UNION
          SELECT assessor_id as trainer_id FROM assessments a
          JOIN clients c ON a.client_id = c.id
          WHERE c.studio_id = ${studioId} 
          AND a.created_at >= ${periodStart} AND a.created_at <= ${periodEnd}
          AND assessor_id IS NOT NULL
          UNION
          SELECT created_by_id as trainer_id FROM workouts 
          WHERE studio_id = ${studioId} 
          AND created_at >= ${periodStart} AND created_at <= ${periodEnd}
          AND created_by_id IS NOT NULL
        ) active_trainers
        INNER JOIN user_studios us ON us.user_id = active_trainers.trainer_id
        WHERE us.studio_id = ${studioId} AND us.role = 'TRAINER'
      `,
    ])

    if (!studio) {
      return NextResponse.json({ success: false, error: 'Studio não encontrado' }, { status: 404 })
    }

    // Calcular trainers ativos
    const activeTrainers = activeTrainersData?.[0]?.count 
      ? Number(activeTrainersData[0].count) 
      : (lastUsageRecord?.activeTrainers || 0)

    return NextResponse.json({
      success: true,
      data: {
        ...studio,
        _count: {
          trainers: totalTrainers,
          activeTrainers: activeTrainers,
          clients: clientsCount,
        },
        lastUsageRecord: lastUsageRecord ? {
          activeTrainers: lastUsageRecord.activeTrainers,
          periodStart: lastUsageRecord.periodStart,
          periodEnd: lastUsageRecord.periodEnd,
        } : null,
      },
    })
  } catch (error) {
    console.error('Error fetching studio settings:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

// PUT /api/studio/settings - Atualizar configurações do studio
export async function PUT(req: NextRequest) {
  try {
    const payload = await verifyAuth()
    if ('error' in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: payload.status })
    }

    const studioId = payload.studioId

    // Verificar se é STUDIO_ADMIN
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        userId: payload.userId,
        studioId: studioId,
      },
    })

    if (!userStudio || userStudio.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas STUDIO_ADMIN pode editar configurações' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, settings } = body

    // Validar dados
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nome do studio é obrigatório' },
        { status: 400 }
      )
    }

    // Atualizar studio
    const updatedStudio = await prisma.studio.update({
      where: { id: studioId },
      data: {
        name: name.trim(),
        settings: settings || {},
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        settings: true,
        status: true,
        isPaid: true,
        plan: {
          select: {
            name: true,
            tier: true,
          },
        },
      },
    })

    // Criar audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Studio',
        entityId: studioId,
        userId: payload.userId,
        studioId: studioId,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedStudio,
    })
  } catch (error) {
    console.error('Error updating studio settings:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
}
