// ============================================================================
// EXPERT PRO TRAINING - WORKOUT GENERATION API
// ============================================================================
// POST /api/studio/workouts/generate - Gerar treino baseado em avaliação
// ============================================================================
// 🧠 CÉREBRO ÚNICO - Template fixo + periodização dinâmica
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'
import { generatePillarRotation, PILLAR_LABELS } from '@/services/pillarRotation'
import {
  generateWorkoutTemplate,
  expandTemplateToSchedule,
  calculateProgress,
} from '@/services/workoutTemplate'

// ============================================================================
// POST - Generate Workout from Assessment
// ============================================================================
const generateWorkoutSchema = z.object({
  assessmentId: z.string().cuid(),
  weeklyFrequency: z.number().min(2).max(6),
  targetWeeks: z.number().min(6).max(8).default(8),
  notes: z.string().optional(),
  levelUp: z.boolean().optional(),
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

    const { assessmentId, weeklyFrequency, targetWeeks, notes, levelUp } = validation.data

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
    // REGRA: Verificar se workout ativo atingiu 85% antes de gerar novo
    // ========================================================================
    const activeWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: true,
      },
    })

    if (activeWorkout) {
      const progress = calculateProgress(
        activeWorkout.sessionsCompleted,
        activeWorkout.sessionsPerWeek,
        activeWorkout.targetWeeks,
        activeWorkout.startDate,
      )

      if (!progress.canReassess) {
        const sessionsNeeded = Math.ceil(
          progress.sessionsPerWeek * 6 * 0.85
        ) - progress.sessionsCompleted

        return NextResponse.json(
          {
            success: false,
            error: `Aluno precisa completar o programa atual antes de gerar novo cronograma. Frequência atual: ${progress.attendanceRateLabel}. Faltam ${Math.max(0, sessionsNeeded)} sessões para atingir 85%.`,
            existingWorkoutId: activeWorkout.id,
            progress,
          },
          { status: 400 }
        )
      }

      // Se pode reavaliar, desativar treino anterior
      await prisma.workout.update({
        where: { id: activeWorkout.id },
        data: { isActive: false, endDate: new Date() },
      })
    }

    // ========================================================================
    // REGRA: Verificar reavaliação obrigatória
    // ========================================================================
    const lastWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (lastWorkout) {
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

    const result = assessment.resultJson as any
    const inputData = assessment.inputJson as any

    // ========================================================================
    // 🧠 MÉTODO EXPERT PRO TRAINING — TEMPLATE FIXO + PERIODIZAÇÃO
    // ========================================================================

    // 1. Buscar estado do rodízio do aluno
    const clientData = await prisma.client.findUnique({
      where: { id: assessment.clientId },
      select: { lastPillarIndex: true, level: true },
    })
    const lastPillarIndex = clientData?.lastPillarIndex ?? 0
    const currentLevel = clientData?.level || 'INICIANTE'

    // Calcular novo nível se levelUp=true
    const LEVELS = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
    let newLevel = currentLevel
    if (levelUp && currentLevel !== 'AVANCADO') {
      const currentIdx = LEVELS.indexOf(currentLevel)
      newLevel = LEVELS[Math.min(currentIdx + 1, LEVELS.length - 1)]
      console.log(`⬆️ PROGRESSÃO DE NÍVEL: ${currentLevel} → ${newLevel}`)
    }

    // 2. Gerar schedule de pilares (apenas 1 semana para template)
    const pillarSchedule = generatePillarRotation({
      trainingDaysPerWeek: weeklyFrequency,
      totalWeeks: 1, // Apenas 1 semana para o template
      lastPillarIndex,
    })

    const weekPillars = pillarSchedule.schedule[0]

    console.log(`🔄 TEMPLATE DE TREINO:`)
    console.log(`   - Último índice: ${lastPillarIndex}`)
    console.log(`   - Frequência: ${weeklyFrequency}x/semana`)
    console.log(`   - Semanas alvo: ${targetWeeks}`)
    console.log(`   - Pilares do template: [${weekPillars.join(', ')}]`)
    console.log(`   - Próximo índice: ${pillarSchedule.lastIndexAfterProgram}`)

    // 3. Determinar objetivo do aluno
    const primaryGoal = result.primaryGoal || inputData?.primaryGoal || 'saude'

    // 4. Gerar TEMPLATE (exercícios fixos, 1 semana)
    const template = generateWorkoutTemplate(
      weekPillars,
      primaryGoal,
      weeklyFrequency,
      targetWeeks,
    )

    // 5. Expandir template em schedule completo (para compatibilidade UI/PDF)
    const schedule = expandTemplateToSchedule(template, primaryGoal)

    console.log(`📅 Template EXPERT gerado:`)
    console.log(`   - Metodologia: Template Fixo + Periodização Dinâmica`)
    console.log(`   - Sessões no template: ${template.sessions.length}`)
    console.log(`   - Semanas alvo: ${targetWeeks} (mín 6, máx 8)`)
    console.log(`   - Regra 85%: ${Math.ceil(weeklyFrequency * 6 * 0.85)} sessões mínimas`)

    // 6. Salvar treino + atualizar lastPillarIndex
    const [workout] = await prisma.$transaction([
      prisma.workout.create({
        data: {
          clientId: assessment.clientId,
          studioId,
          createdById: userId,
          name: `Programa ${PILLAR_LABELS[weekPillars[0]]} - ${assessment.client.name}`,
          blocksUsed: result.allowedBlocks || [],
          scheduleJson: schedule,
          templateJson: template as any,
          targetWeeks,
          sessionsPerWeek: weeklyFrequency,
          sessionsCompleted: 0,
          startDate: new Date(),
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
          level: newLevel,
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
          targetWeeks,
          pillarRotation: {
            previousIndex: lastPillarIndex,
            newIndex: pillarSchedule.lastIndexAfterProgram,
            pillars: weekPillars,
          },
          attendanceThreshold: '85%',
          minWeeks: 6,
          maxWeeks: 8,
        } as any,
      },
    })

    // Calcular progresso inicial
    const progress = calculateProgress(0, weeklyFrequency, targetWeeks)

    return NextResponse.json({
      success: true,
      data: {
        workout,
        schedule,
        template,
        progress,
        level: newLevel,
        previousLevel: currentLevel,
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
