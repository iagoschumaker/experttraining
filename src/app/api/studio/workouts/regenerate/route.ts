// ============================================================================
// EXPERT PRO TRAINING - REGENERATE EXISTING WORKOUTS
// ============================================================================
// POST /api/studio/workouts/regenerate
// Regenera treinos ativos existentes usando o novo motor com filtragem
// de nível + lesões. Usado para atualizar treinos antigos que foram
// gerados sem essas validações.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { generatePillarRotation, PILLAR_LABELS } from '@/services/pillarRotation'
import { mapClientLevel, buildPainContext } from '@/services/pillarExercises'
import {
  generateWorkoutTemplate,
  expandTemplateToSchedule,
} from '@/services/workoutTemplate'

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const body = await request.json().catch(() => ({}))
    const workoutId = body?.workoutId // Optional: regenerate specific workout
    const dryRun = body?.dryRun || false // Preview without saving

    // Find workouts to regenerate
    const whereClause: any = {
      studioId,
      isActive: true,
    }
    if (workoutId) {
      whereClause.id = workoutId
    }

    const workouts = await prisma.workout.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            level: true,
            lastPillarIndex: true,
            trainingDaysPerWeek: true,
          },
        },
      },
    })

    if (workouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum treino ativo encontrado para regenerar.',
        updated: 0,
      })
    }

    const results: any[] = []
    let updatedCount = 0
    let errorCount = 0

    for (const workout of workouts) {
      try {
        const client = workout.client

        // Find the assessment associated with this workout
        const assessment = await prisma.assessment.findFirst({
          where: {
            clientId: client.id,
            status: 'COMPLETED',
            createdAt: { lte: workout.createdAt },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Build pain context from assessment
        const inputData = assessment?.inputJson as any
        const painMap = inputData?.painMap || null
        const painContext = buildPainContext(painMap)

        // Map client level
        const clientLevel = client.level || 'INICIANTE'
        const exerciseLevel = mapClientLevel(clientLevel)

        // Get workout parameters
        const weeklyFrequency = workout.sessionsPerWeek || 3
        const targetWeeks = workout.targetWeeks || 8

        // Determine the starting pillar index
        // Use the lastPillarIndex minus what this workout added
        const totalSessions = weeklyFrequency * targetWeeks
        const PILLARS_COUNT = 3
        const startPillarIndex = ((client.lastPillarIndex || 0) - totalSessions % PILLARS_COUNT + PILLARS_COUNT * 100) % PILLARS_COUNT

        // Generate pillar rotation
        const pillarSchedule = generatePillarRotation({
          trainingDaysPerWeek: weeklyFrequency,
          totalWeeks: targetWeeks,
          lastPillarIndex: startPillarIndex,
        })

        const allPillars = pillarSchedule.schedule.flat()

        // Determine primary goal
        const resultData = assessment?.resultJson as any
        const primaryGoal = resultData?.primaryGoal || inputData?.primaryGoal || 'saude'

        // Generate new template with level + injury filtering
        const template = generateWorkoutTemplate(
          allPillars,
          primaryGoal,
          weeklyFrequency,
          targetWeeks,
          exerciseLevel,
          painContext,
        )

        // Expand to schedule
        const schedule = expandTemplateToSchedule(template, primaryGoal)

        const summary = {
          workoutId: workout.id,
          clientName: client.name,
          clientLevel,
          exerciseLevel,
          pain: {
            knee: painContext.knee,
            lowerBack: painContext.lowerBack,
            shoulder: painContext.shoulder,
            hip: painContext.hip,
          },
          sessionsPerWeek: weeklyFrequency,
          targetWeeks,
          totalSessions: allPillars.length,
          firstPillars: allPillars.slice(0, weeklyFrequency),
        }

        if (!dryRun) {
          // Update the workout with new template and schedule
          await prisma.workout.update({
            where: { id: workout.id },
            data: {
              scheduleJson: schedule,
              templateJson: template as any,
              name: `Programa ${PILLAR_LABELS[allPillars[0]]} - ${client.name}`,
            },
          })

          console.log(`✅ Workout ${workout.id} regenerado para ${client.name} (${exerciseLevel})`)
          updatedCount++
        }

        results.push({ ...summary, status: dryRun ? 'preview' : 'updated' })
      } catch (err: any) {
        console.error(`❌ Erro ao regenerar workout ${workout.id}:`, err.message)
        results.push({
          workoutId: workout.id,
          clientName: workout.client.name,
          status: 'error',
          error: err.message,
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Preview: ${results.length} treinos seriam atualizados.`
        : `${updatedCount} treinos regenerados com sucesso. ${errorCount} erros.`,
      updated: updatedCount,
      errors: errorCount,
      total: workouts.length,
      dryRun,
      results,
    })
  } catch (error) {
    console.error('Regenerate workouts error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao regenerar treinos' },
      { status: 500 }
    )
  }
}
