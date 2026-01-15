// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL API
// ============================================================================
// GET    /api/studio/workouts/[id] - Detalhes do treino
// PUT    /api/studio/workouts/[id] - Atualizar treino
// DELETE /api/studio/workouts/[id] - Arquivar treino
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - Workout Details
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const workoutId = params.id

  try {
    const where: any = { id: workoutId, studioId }

    // TRAINER só vê seus treinos
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const workout = await prisma.workout.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            birthDate: true,
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Get creator info
    const creator = await prisma.user.findUnique({
      where: { id: workout.createdById },
      select: { id: true, name: true, email: true },
    })

    // Get studio info
    const studioData = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        name: true,
        logoUrl: true,
        settings: true,
      },
    })
    
    const studioSettings = studioData?.settings as any || {}
    const studio = studioData ? {
      name: studioData.name,
      logoUrl: studioData.logoUrl,
      phone: studioSettings.phone || null,
      email: studioSettings.email || null,
      address: studioSettings.address || null,
    } : null

    // Get blocks details COM EXERCÍCIOS
    const blocks = await prisma.block.findMany({
      where: {
        code: { in: workout.blocksUsed },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        primaryCapacity: true,
        levelName: true,
        movementPattern: true,
        suggestedFrequency: true,
        estimatedDuration: true,
        isLocked: true,
        exercises: true,
        exercisesList: {
          where: { isActive: true },
          orderBy: { orderInBlock: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            muscleGroup: true,
            equipment: true,
            defaultSets: true,
            defaultReps: true,
            defaultTime: true,
            defaultRest: true,
            orderInBlock: true,
          },
        },
      },
    })

    // Criar mapa de blocos com exercícios para enriquecer o scheduleJson
    const blocksMap = new Map(blocks.map(b => [b.code, b]))

    // ========================================================================
    // MÉTODO EXPERT TRAINING - GERAR BLOCOS NO FORMATO CORRETO
    // ========================================================================
    // Cada bloco tem 3 exercícios: FOCO_PRINCIPAL, PUSH_PULL_INTEGRADO, CORE
    // ========================================================================
    const generateExpertBlocks = (mainFocus: string) => {
      const focusLabel = mainFocus?.includes('LOWER') || mainFocus?.includes('SQUAT') || mainFocus?.includes('PERNA')
        ? 'PERNA' : mainFocus?.includes('UPPER') || mainFocus?.includes('PUSH') ? 'SUPERIOR' : 'PERNA'

      const exerciciosFoco = focusLabel === 'PERNA' ? {
        bloco1: { name: 'Agachamento Goblet', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        bloco2: { name: 'Levantamento Terra Romeno', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        bloco3: { name: 'Avanço Búlgaro', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      } : {
        bloco1: { name: 'Supino com halteres', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        bloco2: { name: 'Remada curvada', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        bloco3: { name: 'Desenvolvimento de ombros', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      }

      return [
        {
          blockIndex: 1,
          name: 'Bloco 1',
          description: 'Introdução',
          restAfterBlock: '90-120s',
          exercises: [
            exerciciosFoco.bloco1,
            { name: 'Landmine Press', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
            { name: 'Prancha frontal', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
          ],
        },
        {
          blockIndex: 2,
          name: 'Bloco 2',
          description: 'Desenvolvimento',
          restAfterBlock: '120-150s',
          exercises: [
            exerciciosFoco.bloco2,
            { name: 'Remada com rotação', sets: 3, reps: '10 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
            { name: 'Pallof Press', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
          ],
        },
        {
          blockIndex: 3,
          name: 'Bloco 3',
          description: 'Integração',
          restAfterBlock: '60-90s',
          exercises: [
            exerciciosFoco.bloco3,
            { name: 'Turkish Get-up parcial', sets: 2, reps: '3 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
            { name: 'Ab Wheel / Rollout', sets: 3, reps: '8-10', rest: '20-40s', role: 'CORE' },
          ],
        },
      ]
    }

    // Extrair weeklyFrequency e phaseDuration do scheduleJson
    const schedule = workout.scheduleJson as any
    const weeklyFrequency = schedule?.weeklyFrequency || 0
    const phaseDuration = schedule?.phaseDuration || 0
    const mainFocus = schedule?.mainFocus || schedule?.primaryFocus || 'PERNA'

    // Enriquecer scheduleJson - para treinos antigos, gerar estrutura Método Expert
    const enrichedSchedule = schedule ? {
      ...schedule,
      mainFocus,
      methodology: schedule.methodology || 'Método Expert Training',
      weeks: schedule.weeks?.map((week: any) => ({
        ...week,
        sessions: week.sessions?.map((session: any) => {
          // Se já tem blocos no formato correto (com exercises que têm role), mantém
          const hasCorrectFormat = session.blocks?.some((b: any) => 
            b.exercises?.some((ex: any) => ex.role)
          )
          
          if (hasCorrectFormat) return session

          // Gerar blocos no formato Método Expert Training
          const expertBlocks = generateExpertBlocks(mainFocus)
          
          // Gerar preparação se não existir (com exercícios específicos baseados no foco)
          const sessionIdx = session.session ? session.session - 1 : 0
          const preparacaoExercicios = mainFocus.includes('PERNA') || mainFocus.includes('LOWER') ? [
            [
              { name: 'Círculos de quadril', sets: 2, reps: '10 cada lado', duration: '2 min' },
              { name: '90/90 Hip Stretch', sets: 2, reps: '30s cada', duration: '2 min' },
              { name: 'Glute Bridges', sets: 2, reps: '12', duration: '2 min' },
              { name: 'Monster Walk', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Agachamento sem peso', sets: 2, reps: '10', duration: '2 min' },
              { name: 'Marcha no lugar', sets: 1, reps: '60s', duration: '2 min' },
            ],
            [
              { name: 'Mobilização de tornozelo', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Alongamento piriforme', sets: 2, reps: '30s cada', duration: '2 min' },
              { name: 'Clamshell', sets: 2, reps: '12 cada', duration: '2 min' },
              { name: 'Prancha c/ elevação perna', sets: 2, reps: '8 cada', duration: '2 min' },
              { name: 'Avanço com rotação', sets: 2, reps: '8 cada', duration: '2 min' },
              { name: 'Polichinelos', sets: 1, reps: '30', duration: '2 min' },
            ],
            [
              { name: 'World Greatest Stretch', sets: 2, reps: '5 cada', duration: '2 min' },
              { name: 'Leg Swings frontal', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Fire Hydrants', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Inchworm', sets: 2, reps: '6', duration: '2 min' },
              { name: 'Skip baixo', sets: 1, reps: '60s', duration: '2 min' },
            ],
          ] : [
            [
              { name: 'Círculos de ombro', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Rotação torácica', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Band Pull-apart', sets: 2, reps: '15', duration: '2 min' },
              { name: 'Prancha c/ toques ombro', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Push-up na parede', sets: 2, reps: '10', duration: '2 min' },
              { name: 'Arm Circles', sets: 1, reps: '30s cada', duration: '2 min' },
            ],
            [
              { name: 'Cat-Cow', sets: 2, reps: '10', duration: '2 min' },
              { name: 'Thread the Needle', sets: 2, reps: '8 cada', duration: '2 min' },
              { name: 'Face Pull leve', sets: 2, reps: '15', duration: '2 min' },
              { name: 'Bird Dog', sets: 2, reps: '8 cada', duration: '2 min' },
              { name: 'Scapular Push-up', sets: 2, reps: '10', duration: '2 min' },
              { name: 'Jumping Jacks', sets: 1, reps: '30', duration: '2 min' },
            ],
            [
              { name: 'Doorway Pec Stretch', sets: 2, reps: '30s cada', duration: '2 min' },
              { name: 'YTWL', sets: 2, reps: '8 cada', duration: '2 min' },
              { name: 'External Rotation', sets: 2, reps: '12 cada', duration: '2 min' },
              { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
              { name: 'Push-up plus', sets: 2, reps: '10', duration: '2 min' },
              { name: 'Bear Crawl', sets: 1, reps: '30s', duration: '2 min' },
            ],
          ]
          
          const preparation = session.preparation?.exercises?.length > 0 ? session.preparation : {
            title: 'Preparação do Movimento',
            totalTime: '12 minutos',
            exercises: preparacaoExercicios[sessionIdx % preparacaoExercicios.length],
          }

          // Gerar protocolo final se não existir
          const finalProtocol = session.finalProtocol || {
            name: 'Protocolo Metabólico Moderado',
            totalTime: '6 minutos',
            structure: '40s trabalho / 20s descanso × 6 rounds',
            exercises: [
              { name: 'Polichinelos', duration: '40s', rest: '20s' },
              { name: 'Agachamento livre', duration: '40s', rest: '20s' },
              { name: 'Corrida estacionária', duration: '40s', rest: '20s' },
            ],
          }

          return {
            ...session,
            focus: mainFocus,
            preparation,
            blocks: expertBlocks,
            finalProtocol,
          }
        }),
      })),
    } : null

    return NextResponse.json({
      success: true,
      data: { 
        ...workout, 
        scheduleJson: enrichedSchedule,
        weeklyFrequency,
        phaseDuration,
        creator, 
        blocks,
        studio
      },
    })
  } catch (error) {
    console.error('Get workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar treino' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update Workout
// ============================================================================
const updateWorkoutSchema = z.object({
  weeklyFrequency: z.number().min(1).max(7).optional(),
  phaseDuration: z.number().min(1).max(52).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  scheduleJson: z.any().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const workoutId = params.id

  try {
    const body = await request.json()
    const validation = updateWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Verificar permissão
    const where: any = { id: workoutId, studioId }
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const existing = await prisma.workout.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar
    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: workoutId,
        newData: validation.data as any,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar treino' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Archive Workout
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const workoutId = params.id

  try {
    // Verificar permissão
    const where: any = { id: workoutId, studioId }
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const existing = await prisma.workout.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Excluir permanentemente (hard delete)
    await prisma.workout.delete({
      where: { id: workoutId },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Workout',
        entityId: workoutId,
        newData: { deleted: true } as any,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao arquivar treino' },
      { status: 500 }
    )
  }
}
