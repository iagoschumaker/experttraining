// ============================================================================
// EXPERT PRO TRAINING - MIGRATION SCRIPT: Atualizar dados existentes
// ============================================================================
// POST /api/superadmin/migrate-phase-data
// 
// Migra todos os dados existentes para o novo formato de fases:
// 1. Clients: Define objective e currentPhase baseados no goal existente
// 2. Assessments: Atualiza objective se não tiver
// 3. Workouts: Atualiza phase e nome se não tiver
// ============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySuperAdmin } from '@/lib/auth'

// Mapeamento de goal legado para ClientObjective
function mapGoalToObjective(goal: string | null, goalType: string | null): string {
  const g = (goal || goalType || '').toUpperCase()
  
  if (g.includes('EMAGRE') || g.includes('WEIGHT_LOSS') || g.includes('PERDA') || g.includes('EMAGREC')) {
    return 'EMAGRECIMENTO'
  }
  if (g.includes('HIPERTROFIA') || g.includes('MUSCLE') || g.includes('MASSA') || g.includes('GANHO')) {
    return 'HIPERTROFIA_OBJ'
  }
  if (g.includes('PERFORM') || g.includes('DESEMPENHO') || g.includes('ATLETA')) {
    return 'PERFORMANCE'
  }
  if (g.includes('REAB') || g.includes('SAUDE') || g.includes('SAÚDE') || g.includes('HEALTH') || g.includes('RECOMP')) {
    return 'REABILITACAO'
  }
  
  // Default: Hipertrofia (mais comum)
  return 'HIPERTROFIA_OBJ'
}

// Mapeamento de level legado para TrainingLevel
function mapLevel(level: string | null): string {
  const l = (level || '').toUpperCase()
  
  if (l.includes('ADVANCED') || l.includes('AVANCADO') || l.includes('AVANÇADO') || l === '3') {
    return 'AVANCADO'
  }
  if (l.includes('INTERMEDIATE') || l.includes('INTERMEDIARIO') || l.includes('INTERMEDIÁRIO') || l === '2') {
    return 'INTERMEDIARIO'
  }
  
  return 'INICIANTE'
}

// Determinar a fase baseada no número de treinos completados
function guessCurrentPhase(sessionsCompleted: number, sessionsPerWeek: number): string {
  const weeksCompleted = Math.floor(sessionsCompleted / Math.max(1, sessionsPerWeek))
  
  if (weeksCompleted < 6) return 'CONDICIONAMENTO_1'
  if (weeksCompleted < 12) return 'CONDICIONAMENTO_2'
  if (weeksCompleted < 18) return 'HIPERTROFIA'
  if (weeksCompleted < 24) return 'FORCA'
  
  return 'FORCA'
}

export async function POST() {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    const log: string[] = []
    let clientsUpdated = 0
    let assessmentsUpdated = 0
    let workoutsUpdated = 0
    let errors: string[] = []

    // ========================================================================
    // 1. MIGRAR CLIENTES
    // ========================================================================
    const clients = await prisma.client.findMany({
      include: {
        workouts: {
          where: { isActive: true },
          select: { sessionsCompleted: true, sessionsPerWeek: true, phase: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    for (const client of clients) {
      try {
        const updates: any = {}
        
        // Set objective if not set
        if (!client.objective) {
          updates.objective = mapGoalToObjective(client.goal, client.goalType)
        }
        
        // Set level if still in old format
        const mappedLevel = mapLevel(client.level)
        if (client.level !== mappedLevel) {
          updates.level = mappedLevel
        }
        
        // Set currentPhase if not set
        if (!client.currentPhase) {
          const activeWorkout = client.workouts[0]
          if (activeWorkout?.phase) {
            updates.currentPhase = activeWorkout.phase
          } else if (activeWorkout) {
            updates.currentPhase = guessCurrentPhase(
              activeWorkout.sessionsCompleted,
              activeWorkout.sessionsPerWeek
            )
          } else {
            updates.currentPhase = 'CONDICIONAMENTO_1'
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await prisma.client.update({
            where: { id: client.id },
            data: updates,
          })
          clientsUpdated++
          log.push(`✅ Client ${client.name}: ${JSON.stringify(updates)}`)
        }
      } catch (err: any) {
        errors.push(`Client ${client.id} (${client.name}): ${err.message}`)
      }
    }

    // ========================================================================
    // 2. MIGRAR ASSESSMENTS
    // ========================================================================
    const assessments = await prisma.assessment.findMany({
      where: { objective: null },
      include: {
        client: {
          select: { goal: true, goalType: true, objective: true },
        },
      },
    })

    for (const assessment of assessments) {
      try {
        const objective = assessment.client.objective ||
          mapGoalToObjective(assessment.client.goal, assessment.client.goalType)
        
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: { objective: objective as any },
        })
        assessmentsUpdated++
      } catch (err: any) {
        errors.push(`Assessment ${assessment.id}: ${err.message}`)
      }
    }

    // ========================================================================
    // 3. MIGRAR WORKOUTS
    // ========================================================================
    const workouts = await prisma.workout.findMany({
      where: { phase: null },
      include: {
        client: {
          select: { 
            name: true, goal: true, goalType: true, objective: true,
            level: true, currentPhase: true
          },
        },
      },
    })

    for (const workout of workouts) {
      try {
        const phase = workout.client.currentPhase ||
          guessCurrentPhase(workout.sessionsCompleted, workout.sessionsPerWeek)
        
        // Generate a better name if missing or generic
        const phaseName = phase.replace(/_/g, ' ')
        const name = workout.name && workout.name !== 'Treino Manual'
          ? workout.name
          : `${phaseName} - ${workout.client.name}`

        await prisma.workout.update({
          where: { id: workout.id },
          data: {
            phase: phase as any,
            name,
          },
        })
        workoutsUpdated++
      } catch (err: any) {
        errors.push(`Workout ${workout.id}: ${err.message}`)
      }
    }

    // ========================================================================
    // RESULTADO
    // ========================================================================
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClients: clients.length,
          clientsUpdated,
          totalAssessments: assessments.length,
          assessmentsUpdated,
          totalWorkouts: workouts.length,
          workoutsUpdated,
          errors: errors.length,
        },
        log: log.slice(0, 50), // Limitar log
        errors: errors.slice(0, 20),
      },
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro na migração' },
      { status: 500 }
    )
  }
}
