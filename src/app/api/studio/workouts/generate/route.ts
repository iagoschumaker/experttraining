// ============================================================================
// EXPERT PRO TRAINING - WORKOUT GENERATION API v2
// ============================================================================
// POST /api/studio/workouts/generate - Gerar treino baseado em avaliação + FASE
// ============================================================================
// 🧠 NOVO: Template vem do catálogo de fases (planilhas)
//    Cada fase tem treinos FIXOS por 6 semanas
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'
// Pillar rotation logic (inlined — was in pillarRotation.ts)
const PILLAR_LABELS: Record<string, string> = {
  LOWER: 'Perna & Quadril',
  PUSH: 'Empurrada',
  PULL: 'Puxada',
}
const PILLARS = ['LOWER', 'PUSH', 'PULL'] as const
function generatePillarRotation({ trainingDaysPerWeek, totalWeeks, lastPillarIndex }: {
  trainingDaysPerWeek: number; totalWeeks: number; lastPillarIndex: number;
}) {
  const schedule: string[][] = []
  let currentIndex = lastPillarIndex
  for (let week = 0; week < totalWeeks; week++) {
    const weekPillars: string[] = []
    for (let day = 0; day < trainingDaysPerWeek; day++) {
      currentIndex = (currentIndex + 1) % PILLARS.length
      weekPillars.push(PILLARS[currentIndex])
    }
    schedule.push(weekPillars)
  }
  return { schedule, lastIndexAfterProgram: currentIndex }
}
import {
  getAvailablePhases,
  isPhaseValid,
  calculatePhaseProgress,
  PHASE_LABELS,
  PHASE_DURATION_WEEKS,
  type TrainingPhase,
  type ClientObjective,
  type TrainingLevel,
} from '@/services/trainingPhases'
import { getPhaseWorkout, type PhaseWorkoutTemplate } from '@/services/phaseWorkouts'
import { getGestanteWorkout, isGestantePhase, type GestantePhaseTemplate } from '@/services/phaseWorkoutsGestante'

// ============================================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================================
const generateWorkoutSchema = z.object({
  assessmentId: z.string().cuid(),
  phase: z.enum([
    'CONDICIONAMENTO_1',
    'CONDICIONAMENTO_2',
    'HIPERTROFIA',
    'FORCA',
    'POTENCIA',
    'RESISTENCIA',
    'METABOLICO',
    'HIPERTROFIA_2',
    'FORCA_2',
    'RESISTENCIA_2',
    'METABOLICO_2',
    'GESTANTE_T1',
    'GESTANTE_T2',
    'GESTANTE_T3_A',
    'GESTANTE_T3_B',
  ]),
  weeklyFrequency: z.number().min(2).max(6),
  notes: z.string().optional(),
  levelUp: z.boolean().optional(),
  objective: z.enum(['EMAGRECIMENTO', 'HIPERTROFIA_OBJ', 'PERFORMANCE', 'REABILITACAO', 'GESTANTE']).optional(),
  gestationalWeek: z.number().min(1).max(42).optional(),
  mode: z.enum(['auto', 'manual']).optional().default('auto'),
  customTemplate: z.any().optional(), // Treinos editados pelo personal (modo manual)
})

// ============================================================================
// PILLAR MAPPING: PERNA → LOWER, EMPURRA → PUSH, PUXA → PULL
// ============================================================================
const PILLAR_MAP: Record<string, string> = {
  PERNA: 'LOWER',
  EMPURRA: 'PUSH',
  PUXA: 'PULL',
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    console.log('📦 Workout Generation v2 Request:', JSON.stringify(body, null, 2))

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

    const { assessmentId, phase, weeklyFrequency, notes, levelUp, mode, customTemplate, objective: bodyObjective, gestationalWeek } = validation.data

    // ========================================================================
    // Buscar avaliação
    // ========================================================================
    const where: any = { id: assessmentId }
    where.client = { studioId }

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
    // Verificar se workout ativo atingiu 85% antes de gerar novo
    // ========================================================================
    const activeWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: true,
      },
    })

    if (activeWorkout) {
      const progress = calculatePhaseProgress(
        activeWorkout.sessionsCompleted,
        activeWorkout.sessionsPerWeek,
      )

      if (!progress.isComplete && progress.percentage < 85) {
        const sessionsNeeded = Math.ceil(
          activeWorkout.sessionsPerWeek * PHASE_DURATION_WEEKS * 0.85
        ) - activeWorkout.sessionsCompleted

        return NextResponse.json(
          {
            success: false,
            error: `Aluno precisa completar a fase atual antes de gerar novo cronograma. Progresso: ${progress.percentage}%. Faltam ${Math.max(0, sessionsNeeded)} sessões.`,
            existingWorkoutId: activeWorkout.id,
            progress,
          },
          { status: 400 }
        )
      }

      // Se pode gerar novo, desativar treino anterior
      await prisma.workout.update({
        where: { id: activeWorkout.id },
        data: { isActive: false, endDate: new Date() },
      })
    }

    // ========================================================================
    // Verificar reavaliação obrigatória
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
    // DADOS DO ALUNO
    // ========================================================================
    const clientData = await prisma.client.findUnique({
      where: { id: assessment.clientId },
      select: { lastPillarIndex: true, level: true, objective: true },
    })
    const lastPillarIndex = clientData?.lastPillarIndex ?? 0
    const currentLevel = (clientData?.level || 'INICIANTE') as TrainingLevel
    // Prioridade: 1) objetivo selecionado na UI de geração, 2) client, 3) assessment, 4) fallback
    const objective = (bodyObjective ||
      clientData?.objective ||
      assessment.objective ||
      mapGoalToObjective(result.primaryGoal || inputData?.primaryGoal)) as ClientObjective

    // Calcular novo nível se levelUp=true
    const LEVELS: TrainingLevel[] = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
    let newLevel = currentLevel
    if (levelUp && currentLevel !== 'AVANCADO') {
      const currentIdx = LEVELS.indexOf(currentLevel)
      newLevel = LEVELS[Math.min(currentIdx + 1, LEVELS.length - 1)]
      console.log(`⬆️ PROGRESSÃO DE NÍVEL: ${currentLevel} → ${newLevel}`)
    }

    // ========================================================================
    // VALIDAR FASE SELECIONADA
    // ========================================================================
    if (!isPhaseValid(phase as TrainingPhase, newLevel, objective)) {
      const available = getAvailablePhases(newLevel, objective)
      return NextResponse.json(
        {
          success: false,
          error: `Fase "${PHASE_LABELS[phase as TrainingPhase]}" não está disponível para nível ${newLevel} com objetivo ${objective}.`,
          availablePhases: available.map(p => ({
            value: p,
            label: PHASE_LABELS[p],
          })),
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // RAMO: GESTANTE vs EXPERT PRO
    // ========================================================================
    const isGestante = objective === 'GESTANTE' || isGestantePhase(phase)

    if (isGestante) {
      // ====================================================================
      // FLUXO GESTANTE — sem pilares, sem rotação, sessão full-body
      // ====================================================================
      const gestanteTemplate = getGestanteWorkout(phase as TrainingPhase)
      if (!gestanteTemplate) {
        return NextResponse.json(
          { success: false, error: `Template gestante não encontrado para fase ${phase}.` },
          { status: 400 }
        )
      }

      const gestanteFreq = gestanteTemplate.sessionsPerWeek
      const schedule = buildGestanteSchedule(gestanteTemplate, gestanteFreq)

      const workoutName = `${gestanteTemplate.phaseLabel} - ${assessment.client.name}`

      const [workout] = await prisma.$transaction([
        prisma.workout.create({
          data: {
            clientId: assessment.clientId,
            studioId,
            createdById: userId,
            name: workoutName,
            phase: phase as any,
            assessmentId,
            blocksUsed: [],
            scheduleJson: schedule,
            templateJson: gestanteTemplate as any,
            targetWeeks: PHASE_DURATION_WEEKS,
            sessionsPerWeek: gestanteFreq,
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
            currentPhase: phase as any,
            objective: 'GESTANTE' as any,
            gestationalWeek: gestationalWeek || null,
            trainingDaysPerWeek: gestanteFreq,
          },
        }),
      ])

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'GENERATE',
          entity: 'Workout',
          entityId: workout.id,
          newData: {
            type: 'GESTANTE',
            assessmentId,
            phase,
            phaseLabel: gestanteTemplate.phaseLabel,
            trimester: gestanteTemplate.trimester,
            gestationalWeek,
            weeklyFrequency: gestanteFreq,
          } as any,
        },
      })

      const progress = calculatePhaseProgress(0, gestanteFreq)

      return NextResponse.json({
        success: true,
        data: {
          workout,
          schedule,
          template: gestanteTemplate,
          progress,
          level: 'GESTANTE',
          phase,
          phaseLabel: gestanteTemplate.phaseLabel,
          objective: 'GESTANTE',
          isGestante: true,
          recommendations: [],
        },
      })
    }

    // ========================================================================
    // FLUXO EXPERT PRO (normal) — pilares + rotação
    // ========================================================================

    // BUSCAR TEMPLATE DA FASE NO CATÁLOGO
    const phaseTemplate = getPhaseWorkout(newLevel, phase as TrainingPhase)

    if (!phaseTemplate) {
      return NextResponse.json(
        {
          success: false,
          error: `Template de treino não encontrado para nível ${newLevel}, fase ${phase}.`,
        },
        { status: 400 }
      )
    }

    console.log(`📋 FASE SELECIONADA: ${phaseTemplate.phaseLabel}`)
    console.log(`   - Nível: ${newLevel}`)
    console.log(`   - Objetivo: ${objective}`)
    console.log(`   - Treinos no template: ${phaseTemplate.treinos.length}`)
    console.log(`   - Duração: ${PHASE_DURATION_WEEKS} semanas`)

    // GERAR ROTAÇÃO DE PILARES
    const pillarSchedule = generatePillarRotation({
      trainingDaysPerWeek: weeklyFrequency,
      totalWeeks: PHASE_DURATION_WEEKS,
      lastPillarIndex,
    })

    const allPillars = pillarSchedule.schedule.flat()

    // MONTAR SCHEDULE BASEADO NO TEMPLATE DA FASE
    const finalTemplate = (mode === 'manual' && customTemplate)
      ? {
          ...phaseTemplate,
          treinos: customTemplate.treinos || phaseTemplate.treinos,
        }
      : phaseTemplate

    const schedule = buildScheduleFromPhase(finalTemplate, allPillars, weeklyFrequency)

    // SALVAR TREINO
    const modeLabel = mode === 'manual' ? ' (Manual)' : ''
    const workoutName = `${phaseTemplate.phaseLabel}${modeLabel} - ${assessment.client.name}`

    const [workout] = await prisma.$transaction([
      prisma.workout.create({
        data: {
          clientId: assessment.clientId,
          studioId,
          createdById: userId,
          name: workoutName,
          phase: phase as any,
          assessmentId,
          blocksUsed: [],
          scheduleJson: schedule,
          templateJson: phaseTemplate as any,
          targetWeeks: PHASE_DURATION_WEEKS,
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
          currentPhase: phase as any,
          objective: objective,
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
          phase,
          phaseLabel: phaseTemplate.phaseLabel,
          level: newLevel,
          objective,
          weeklyFrequency,
          targetWeeks: PHASE_DURATION_WEEKS,
          pillarRotation: {
            previousIndex: lastPillarIndex,
            newIndex: pillarSchedule.lastIndexAfterProgram,
            pillars: allPillars.slice(0, weeklyFrequency),
          },
        } as any,
      },
    })

    // Calcular progresso inicial
    const progress = calculatePhaseProgress(0, weeklyFrequency)

    return NextResponse.json({
      success: true,
      data: {
        workout,
        schedule,
        template: phaseTemplate,
        progress,
        level: newLevel,
        previousLevel: currentLevel,
        phase,
        phaseLabel: phaseTemplate.phaseLabel,
        objective,
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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Mapeia goals antigos para o novo enum ClientObjective
 */
function mapGoalToObjective(goal: string): ClientObjective {
  const map: Record<string, ClientObjective> = {
    emagrecimento: 'EMAGRECIMENTO',
    hipertrofia_funcional: 'HIPERTROFIA_OBJ',
    performance: 'PERFORMANCE',
    recondicionamento: 'REABILITACAO',
    saude: 'REABILITACAO',
  }
  return map[goal?.toLowerCase()] || 'REABILITACAO'
}

/**
 * Constrói o schedule completo a partir do template da fase e rotação de pilares.
 * Cada sessão recebe o treino correspondente ao pilar (LOWER=PERNA, PUSH=EMPURRA, PULL=PUXA).
 */
function buildScheduleFromPhase(
  template: PhaseWorkoutTemplate,
  allPillars: string[],
  weeklyFrequency: number
) {
  const weeks: any[] = []
  let sessionIndex = 0

  for (let week = 0; week < PHASE_DURATION_WEEKS; week++) {
    const weekSessions: any[] = []

    for (let day = 0; day < weeklyFrequency; day++) {
      if (sessionIndex >= allPillars.length) break

      const pillar = allPillars[sessionIndex]
      // Mapear pilar para tipo de treino
      const treinoType = pillar === 'LOWER' ? 'PERNA' : pillar === 'PUSH' ? 'EMPURRA' : 'PUXA'
      const treino = template.treinos.find(t => t.pillar === treinoType)

      if (treino) {
        // Determinar progression para a semana atual
        const weekLabel = `S${week + 1}`

        weekSessions.push({
          sessionNumber: sessionIndex + 1,
          day: day + 1,
          pillar,
          pillarLabel: PILLAR_LABELS[pillar] || pillar,
          treino: {
            pillar: treino.pillar,
            pillarLabel: treino.pillarLabel,
            series: treino.series,
            blocos: treino.blocos.map(bloco => ({
              name: bloco.name,
              exercises: bloco.exercises.map(ex => ({
                name: ex.name,
                reps: ex.weeklyReps?.[week] || ex.reps,
                load: ex.weeklyLoad?.[week] || '',
              })),
            })),
            protocoloFinal: treino.protocoloFinal,
          },
          preparation: template.preparations[
            treinoType === 'PERNA' ? 0 : treinoType === 'EMPURRA' ? 1 : 2
          ] || template.preparations[0],
          week: week + 1,
          weekLabel,
        })
      }

      sessionIndex++
    }

    weeks.push({
      week: week + 1,
      sessions: weekSessions,
    })
  }

  return {
    phaseLabel: template.phaseLabel,
    level: template.level,
    phase: template.phase,
    totalWeeks: PHASE_DURATION_WEEKS,
    totalSessions: allPillars.length,
    weeks,
  }
}

/**
 * Constrói schedule gestante: sessões full-body idênticas (sem rotação de pilares).
 * Cada sessão traz: aquecimento, blocos, alongamento, relaxamento, alertas de segurança.
 */
function buildGestanteSchedule(
  template: GestantePhaseTemplate,
  sessionsPerWeek: number
) {
  const weeks: any[] = []
  let sessionIndex = 0

  for (let week = 0; week < PHASE_DURATION_WEEKS; week++) {
    const weekSessions: any[] = []

    for (let day = 0; day < sessionsPerWeek; day++) {
      sessionIndex++
      weekSessions.push({
        sessionNumber: sessionIndex,
        day: day + 1,
        pillar: 'GESTANTE',
        pillarLabel: 'Sessão Gestante',
        gestante: {
          title: template.session.title,
          estimatedDuration: template.session.estimatedDuration,
          warmup: template.session.warmup,
          blocks: template.session.blocks,
          stretching: template.session.stretching,
          relaxation: template.session.relaxation,
          safetyNotes: template.session.safetyNotes,
        },
        week: week + 1,
        weekLabel: `S${week + 1}`,
      })
    }

    weeks.push({
      week: week + 1,
      sessions: weekSessions,
    })
  }

  return {
    phaseLabel: template.phaseLabel,
    phase: template.phase,
    trimester: template.trimester,
    gestationalWeeksRange: template.gestationalWeeksRange,
    isGestante: true,
    maxHeartRate: template.maxHeartRate,
    maxTemp: template.maxTemp,
    totalWeeks: PHASE_DURATION_WEEKS,
    totalSessions: PHASE_DURATION_WEEKS * sessionsPerWeek,
    weeks,
  }
}
