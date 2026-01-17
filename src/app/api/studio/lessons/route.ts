// ============================================================================
// EXPERT PRO TRAINING - LESSONS API [DEPRECATED]
// ============================================================================
// ⚠️ FUNCIONALIDADE DESCONTINUADA
// 
// O controle por aulas foi removido do Método EXPERT PRO TRAINING.
// O sistema agora é gerenciado por Avaliações e Cronogramas.
//
// GET  /api/studio/lessons - Lista aulas (APENAS HISTÓRICO - READ-ONLY)
// POST /api/studio/lessons - DESATIVADO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// Flag para desativar criação de novas aulas
const LESSONS_DEPRECATED = true

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
// POST - Start Lesson [DEPRECATED]
// ============================================================================
// ⚠️ FUNCIONALIDADE DESCONTINUADA
// A criação de novas aulas foi desativada.
// O método agora é controlado por Avaliações e Cronogramas.
// ============================================================================
export async function POST(request: NextRequest) {
  // Bloquear criação de novas aulas
  if (LESSONS_DEPRECATED) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Funcionalidade descontinuada. O controle por aulas foi removido do Método EXPERT PRO TRAINING. Use Avaliações e Cronogramas.',
        deprecated: true 
      },
      { status: 410 } // 410 Gone - recurso não mais disponível
    )
  }

  // Código legado abaixo - não será executado
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  return NextResponse.json(
    { success: false, error: 'Funcionalidade descontinuada' },
    { status: 410 }
  )
}

/* CÓDIGO LEGADO - MANTIDO PARA REFERÊNCIA
const startLessonSchema = z.object({
  clientIds: z.array(z.string().cuid()).min(1, 'Selecione pelo menos um aluno'),
  type: z.enum(['INDIVIDUAL', 'GROUP']).default('INDIVIDUAL'),
  photoUrl: z.string().min(1, 'Foto obrigatória para iniciar aula'),
  photoKey: z.string().optional(),
  notes: z.string().optional(),
})

async function POST_LEGACY(request: NextRequest) {
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

    // Validação 1: Foto obrigatória
    if (!data.photoUrl || data.photoUrl.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Foto obrigatória para iniciar aula. Tire uma foto no momento.' },
        { status: 400 }
      )
    }

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
      select: { id: true, name: true },
    })

    if (validClients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum cliente válido encontrado' },
        { status: 400 }
      )
    }

    if (validClients.length !== data.clientIds.length) {
      return NextResponse.json(
        { success: false, error: 'Um ou mais clientes não pertencem ao studio ou a você' },
        { status: 400 }
      )
    }

    // ========================================================================
    // VALIDAÇÃO 2: Verificar se existe aula em andamento para esses alunos
    // ========================================================================
    const lessonsInProgress = await prisma.lesson.findMany({
      where: {
        studioId,
        status: 'STARTED',
        clients: {
          some: {
            clientId: { in: data.clientIds },
          },
        },
      },
      include: {
        clients: {
          include: {
            client: { select: { name: true } },
          },
        },
      },
    })

    if (lessonsInProgress.length > 0) {
      const clientsInLesson = lessonsInProgress
        .flatMap(l => l.clients.map(c => c.client.name))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')
      
      return NextResponse.json(
        { success: false, error: `Os seguintes alunos já possuem aula em andamento: ${clientsInLesson}` },
        { status: 400 }
      )
    }

    // ========================================================================
    // VALIDAÇÃO 3: Verificar se alunos já treinaram hoje
    // ========================================================================
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const lessonsToday = await prisma.lesson.findMany({
      where: {
        studioId,
        status: 'COMPLETED',
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
        clients: {
          some: {
            clientId: { in: data.clientIds },
          },
        },
      },
      include: {
        clients: {
          include: {
            client: { select: { name: true } },
          },
        },
      },
    })

    if (lessonsToday.length > 0) {
      const clientsWithLesson = lessonsToday
        .flatMap(l => l.clients.filter(c => data.clientIds.includes(c.clientId)).map(c => c.client.name))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')
      
      return NextResponse.json(
        { success: false, error: `Os seguintes alunos já treinaram hoje: ${clientsWithLesson}` },
        { status: 400 }
      )
    }

    // ========================================================================
    // VALIDAÇÃO 4: Buscar cronograma ativo dos clientes
    // ========================================================================
    // Buscar treinos ativos dos clientes selecionados
    const activeWorkouts = await prisma.workout.findMany({
      where: {
        studioId,
        clientId: { in: data.clientIds },
        isActive: true,
      },
      select: {
        id: true,
        clientId: true,
        scheduleJson: true,
      },
    })

    // Para aulas em grupo, verificar se todos têm treino ativo
    // Para aulas individuais, exigir treino ativo
    let workoutId: string | null = null
    let weekIndex: number | null = null
    let dayIndex: number | null = null
    let focus: string | null = null

    if (activeWorkouts.length > 0) {
      // Usar o primeiro treino encontrado como referência
      const workout = activeWorkouts[0]
      workoutId = workout.id
      
      // Tentar extrair informações do cronograma
      const schedule = workout.scheduleJson as any
      if (schedule) {
        // Calcular semana atual baseado na data de início do treino
        // Por padrão, usar semana 1, dia correspondente ao dia da semana
        const dayOfWeek = new Date().getDay() // 0 = domingo, 1 = segunda, etc.
        weekIndex = 1 // Pode ser calculado baseado na data de início
        dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek // Converter domingo de 0 para 7
        focus = schedule.mainFocus || 'FUNCIONAL'
      }
    }

    // Se nenhum cliente tem treino ativo, avisar mas permitir (para flexibilidade)
    // Comentado para não bloquear, mas pode ser descomentado se necessário
    // if (activeWorkouts.length === 0) {
    //   return NextResponse.json(
    //     { success: false, error: 'Nenhum dos alunos selecionados possui cronograma de treino ativo' },
    //     { status: 400 }
    //   )
    // }

    // ========================================================================
    // CRIAR AULA
    // ========================================================================
    const now = new Date()
    const lessonDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const lesson = await prisma.lesson.create({
      data: {
        studioId,
        trainerId: userId,
        type: lessonType,
        photoUrl: data.photoUrl,
        photoKey: data.photoKey,
        notes: data.notes,
        status: 'STARTED',
        date: lessonDate,
        startedAt: now,
        workoutId,
        weekIndex,
        dayIndex,
        focus,
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
          startedAt: now.toISOString(),
          workoutId,
          weekIndex,
          dayIndex,
          focus,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: lesson.id,
        type: lesson.type,
        status: lesson.status,
        date: lessonDate,
        startedAt: now,
        photoUrl: data.photoUrl,
        workoutId,
        weekIndex,
        dayIndex,
        focus,
        clients: (lesson as any).clients?.map((lc: any) => lc.client) || [],
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
*/
