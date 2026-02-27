// ============================================================================
// EXPERT PRO TRAINING - WORKOUT GENERATION API
// ============================================================================
// POST /api/studio/workouts/generate - Gerar treino baseado em avaliação
// ============================================================================
// 🧠 CÉREBRO ÚNICO - Usado por Studio e Personal
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'
import { generatePillarRotation, PILLAR_LABELS } from '@/services/pillarRotation'
import {
  getPreparationExercises,
  generateBlocks,
  generateFinalProtocol as generateFinalProtocolFn,
} from '@/services/pillarExercises'

// ============================================================================
// POST - Generate Workout from Assessment
// ============================================================================
const generateWorkoutSchema = z.object({
  assessmentId: z.string().cuid(),
  weeklyFrequency: z.number().min(2).max(6),
  phaseDuration: z.number().min(1).max(12).default(4),
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
    console.log('📦 Workout Generation Request:', JSON.stringify(body, null, 2))

    const validation = generateWorkoutSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        },
        { status: 400 }
      )
    }

    const { assessmentId, weeklyFrequency, phaseDuration, notes } = validation.data

    // Buscar avaliação
    const where: any = { id: assessmentId }
    where.client = { studioId }

    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    const assessment = await prisma.assessment.findFirst({
      where,
      include: {
        client: true,
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    if (assessment.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Avaliação não foi processada' },
        { status: 400 }
      )
    }

    if (!assessment.resultJson) {
      return NextResponse.json(
        { success: false, error: 'Avaliação sem resultado processado' },
        { status: 400 }
      )
    }

    // TRAINER só pode gerar para seus clientes
    if (role === 'TRAINER' && assessment.client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para este cliente' },
        { status: 403 }
      )
    }

    // ========================================================================
    // REGRA DO MÉTODO: Verificar se precisa de reavaliação
    // ========================================================================
    // Se existe cronograma finalizado mais recente que a avaliação,
    // bloquear geração e exigir nova avaliação
    // ========================================================================
    const lastWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: false, // Cronograma finalizado/inativo
      },
      orderBy: { createdAt: 'desc' },
    })

    if (lastWorkout) {
      // Verificar se a avaliação é mais recente que o último cronograma
      const assessmentDate = new Date(assessment.createdAt)
      const workoutDate = new Date(lastWorkout.createdAt)

      if (assessmentDate < workoutDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Reavaliação obrigatória! O último cronograma foi finalizado após esta avaliação. Realize uma nova avaliação para gerar novo cronograma.',
            requiresReassessment: true,
            lastWorkoutDate: lastWorkout.createdAt,
            assessmentDate: assessment.createdAt,
          },
          { status: 400 }
        )
      }
    }

    // Verificar se já existe cronograma ativo para este cliente
    const activeWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: true,
      },
    })

    if (activeWorkout) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este aluno já possui um cronograma ativo. Finalize ou arquive o cronograma atual antes de gerar um novo.',
          existingWorkoutId: activeWorkout.id,
        },
        { status: 400 }
      )
    }

    const result = assessment.resultJson as any
    const inputData = assessment.inputJson as any

    // ========================================================================
    // 🧠 MÉTODO EXPERT PRO TRAINING — RODÍZIO POR PILARES
    // ========================================================================
    // PILARES: LOWER (Perna & Quadril) → PUSH (Empurrada) → PULL (Puxada)
    // Rodízio circular contínuo, persistente por aluno
    // ========================================================================

    // 1. Buscar estado do rodízio do aluno
    const clientData = await prisma.client.findUnique({
      where: { id: assessment.clientId },
      select: { lastPillarIndex: true },
    })
    const lastPillarIndex = clientData?.lastPillarIndex ?? 0

    // 2. Gerar schedule de pilares
    const pillarSchedule = generatePillarRotation({
      trainingDaysPerWeek: weeklyFrequency,
      totalWeeks: phaseDuration,
      lastPillarIndex,
    })

    console.log(`🔄 RODÍZIO DE PILARES:`)
    console.log(`   - Último índice: ${lastPillarIndex}`)
    console.log(`   - Frequência: ${weeklyFrequency}x/semana`)
    console.log(`   - Semanas: ${phaseDuration}`)
    pillarSchedule.schedule.forEach((week, i) => {
      console.log(`   - Semana ${i + 1}: [${week.join(', ')}]`)
    })
    console.log(`   - Próximo índice: ${pillarSchedule.lastIndexAfterProgram}`)

    // 3. Determinar objetivo do aluno
    const primaryGoal = result.primaryGoal || inputData?.primaryGoal || 'saude'

    // 4. Montar cronograma completo
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const optimalDays = weeklyFrequency === 2 ? ['Segunda', 'Quinta'] :
      weeklyFrequency === 3 ? ['Segunda', 'Quarta', 'Sexta'] :
        weeklyFrequency === 4 ? ['Segunda', 'Terça', 'Quinta', 'Sexta'] :
          weeklyFrequency === 5 ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] :
            weekDays.slice(0, weeklyFrequency)

    const schedule: any = {
      weeklyFrequency,
      phaseDuration,
      methodology: 'Método EXPERT PRO TRAINING',
      pillarSystem: 'LOWER → PUSH → PULL (rodízio circular)',
      structure: {
        preparation: 'Preparação do Movimento (12 min)',
        blocks: '3 blocos obrigatórios (3 exercícios cada)',
        protocol: 'Protocolo Final (6-8 min)',
      },
      weeks: [] as any[],
    }

    // Gerar cada semana
    for (let week = 0; week < phaseDuration; week++) {
      const weekPhase = week < Math.ceil(phaseDuration / 3) ? 'ADAPTATION' :
        week < Math.ceil(phaseDuration * 2 / 3) ? 'DEVELOPMENT' : 'PEAK'

      const weekSchedule: any = {
        week: week + 1,
        phase: weekPhase,
        phaseLabel: weekPhase === 'ADAPTATION' ? 'Adaptação' :
          weekPhase === 'DEVELOPMENT' ? 'Desenvolvimento' : 'Pico',
        sessions: [] as any[],
      }

      // Gerar cada sessão da semana
      const weekPillars = pillarSchedule.schedule[week]

      for (let session = 0; session < weeklyFrequency; session++) {
        const pillar = weekPillars[session]
        const pillarLabel = PILLAR_LABELS[pillar]

        // Preparação do Movimento
        const prepExercises = getPreparationExercises(pillar, session)
        const preparation = {
          title: 'Preparação do Movimento',
          totalTime: '12 minutos',
          exercises: prepExercises,
        }

        // 3 Blocos obrigatórios
        const blocks = generateBlocks(pillar, week, session)

        // Protocolo Final
        const finalProtocol = generateFinalProtocolFn(primaryGoal, weekPhase)

        // Calcular duração total
        const prepTime = 12
        const blocksTime = 45 // ~15 min por bloco
        const protocolTime = parseInt(finalProtocol.totalTime) || 6
        const totalDuration = prepTime + blocksTime + protocolTime

        weekSchedule.sessions.push({
          session: session + 1,
          day: optimalDays[session] || weekDays[session],
          pillar,
          pillarLabel,
          focus: pillarLabel,
          estimatedDuration: totalDuration,
          preparation,
          blocks,
          finalProtocol,
        })
      }

      schedule.weeks.push(weekSchedule)
    }

    console.log(`📅 Cronograma MÉTODO EXPERT gerado:`)
    console.log(`   - Metodologia: Rodízio por Pilares`)
    console.log(`   - Semanas: ${phaseDuration}`)
    console.log(`   - Sessões/semana: ${weeklyFrequency}`)
    console.log(`   - Estrutura: Preparação + 3 Blocos + Protocolo Final`)

    // 5. Salvar treino + atualizar lastPillarIndex em transação
    const [workout] = await prisma.$transaction([
      prisma.workout.create({
        data: {
          clientId: assessment.clientId,
          studioId,
          createdById: userId,
          name: `Programa ${PILLAR_LABELS[pillarSchedule.schedule[0][0]]} - ${assessment.client.name}`,
          blocksUsed: result.allowedBlocks || [],
          scheduleJson: schedule,
          isActive: true,
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.client.update({
        where: { id: assessment.clientId },
        data: {
          lastPillarIndex: pillarSchedule.lastIndexAfterProgram,
          trainingDaysPerWeek: weeklyFrequency,
        },
      }),
    ])

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GENERATE',
        entity: 'Workout',
        entityId: workout.id,
        newData: {
          assessmentId,
          weeklyFrequency,
          phaseDuration,
          pillarRotation: {
            previousIndex: lastPillarIndex,
            newIndex: pillarSchedule.lastIndexAfterProgram,
            schedule: pillarSchedule.schedule,
          },
        } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        workout,
        schedule,
        pillarRotation: {
          pillars: pillarSchedule.schedule,
          nextIndex: pillarSchedule.lastIndexAfterProgram,
        },
        recommendations: result.recommendations || [],
      },
    })
  } catch (error) {
    console.error('Generate workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar treino' },
      { status: 500 }
    )
  }
}

