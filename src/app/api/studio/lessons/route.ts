// ============================================================================
// EXPERT TRAINING - LESSONS API
// ============================================================================
// GET  /api/studio/lessons - Lista aulas
// POST /api/studio/lessons - Inicia nova aula
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - List Lessons
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const trainerId = searchParams.get('trainerId')
  const status = searchParams.get('status')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const where: any = { studioId }

    // All trainers can see all lessons in the studio
    // Filter by trainer only if explicitly requested
    if (trainerId) {
      where.trainerId = trainerId
    }

    if (status) {
      where.status = status
    }

    // Filtro de data
    if (startDate || endDate) {
      where.startedAt = {}
      if (startDate) {
        where.startedAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.startedAt.lte = new Date(endDate)
      }
    }

    const [total, lessons] = await Promise.all([
      prisma.lesson.count({ where }),
      prisma.lesson.findMany({
        where,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          clients: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Formatar resposta
    const formattedLessons = lessons.map((lesson: any) => ({
      id: lesson.id,
      type: lesson.type,
      status: lesson.status,
      startedAt: lesson.startedAt,
      endedAt: lesson.endedAt,
      duration: lesson.duration,
      photoUrl: lesson.photoUrl,
      notes: lesson.notes,
      trainer: lesson.trainer,
      clients: lesson.clients.map((lc: any) => lc.client),
      clientCount: lesson.clients.length,
    }))

    return NextResponse.json({
      success: true,
      data: {
        items: formattedLessons,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error('List lessons error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar aulas' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Start Lesson (Iniciar Aula)
// ============================================================================
const startLessonSchema = z.object({
  clientIds: z.array(z.string().cuid()).min(1, 'Selecione pelo menos um aluno'),
  type: z.enum(['INDIVIDUAL', 'GROUP']).default('INDIVIDUAL'),
  photoUrl: z.string().url().optional(),
  photoKey: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    const validation = startLessonSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Determinar tipo de aula baseado na quantidade de alunos
    const lessonType = data.clientIds.length > 1 ? 'GROUP' : (data.type || 'INDIVIDUAL')

    // Verificar se os clientes existem e pertencem ao studio
    const clientWhere: any = {
      id: { in: data.clientIds },
      studioId,
    }

    // TRAINER só pode iniciar aula com seus clientes
    if (role === 'TRAINER') {
      clientWhere.trainerId = userId
    }

    const validClients = await prisma.client.findMany({
      where: clientWhere,
      select: { id: true },
    })

    if (validClients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum cliente válido encontrado' },
        { status: 400 }
      )
    }

    if (validClients.length !== data.clientIds.length) {
      return NextResponse.json(
        { success: false, error: 'Um ou mais clientes não pertencem ao studio' },
        { status: 400 }
      )
    }

    // Criar aula
    const lesson = await prisma.lesson.create({
      data: {
        studioId,
        trainerId: userId,
        type: lessonType,
        photoUrl: data.photoUrl,
        photoKey: data.photoKey,
        notes: data.notes,
        status: 'STARTED',
        clients: {
          create: data.clientIds.map((clientId) => ({
            clientId,
          })),
        },
      },
      include: {
        clients: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'CREATE',
        entity: 'Lesson',
        entityId: lesson.id,
        newData: {
          type: lessonType,
          clientCount: data.clientIds.length,
          clientIds: data.clientIds,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: lesson.id,
        type: lesson.type,
        status: lesson.status,
        startedAt: lesson.startedAt,
        photoUrl: lesson.photoUrl,
        clients: lesson.clients.map((lc: any) => lc.client),
      },
      message: 'Aula iniciada com sucesso!',
    })
  } catch (error) {
    console.error('Start lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao iniciar aula' },
      { status: 500 }
    )
  }
}
