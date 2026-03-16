// ============================================================================
// EXPERT PRO TRAINING - MIGRATE EXISTING WORKOUTS + CLEANUP
// ============================================================================
// SuperAdmin-only endpoint:
//   1) Regenerate all active workouts with new Juba method exercises
//   2) Delete orphaned workouts (inactive, no lessons)
//   3) Delete orphaned/empty assessments
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifySuperAdmin } from '@/lib/auth/protection'
import { generatePillarRotation, PILLAR_LABELS } from '@/services/pillarRotation'
import {
    generateWorkoutTemplate,
    expandTemplateToSchedule,
} from '@/services/workoutTemplate'

export async function POST(request: NextRequest) {
    // SuperAdmin only (cookie-based, no studio needed)
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
        return NextResponse.json(
            { success: false, error: 'Acesso não autorizado — apenas SuperAdmin' },
            { status: 403 }
        )
    }

    const userId = adminPayload.userId

    try {
        const stats = {
            workoutsRegenerated: 0,
            workoutsDeleted: 0,
            assessmentsDeleted: 0,
            lessonsDeleted: 0,
            lessonClientsDeleted: 0,
            errors: [] as string[],
        }

        console.log('🔄 [MIGRATE] Iniciando migração de treinos e limpeza...')

        // ======================================================================
        // STEP 1: Delete orphaned assessments (ALL studios)
        // ======================================================================
        console.log('🧹 [MIGRATE] Limpando avaliações órfãs...')

        const orphanedAssessments = await prisma.assessment.findMany({
            where: {
                status: 'PENDING',
                resultJson: { equals: Prisma.JsonNull },
            },
            select: { id: true },
        })

        if (orphanedAssessments.length > 0) {
            const deleteResult = await prisma.assessment.deleteMany({
                where: { id: { in: orphanedAssessments.map(a => a.id) } },
            })
            stats.assessmentsDeleted = deleteResult.count
            console.log(`   ✅ ${deleteResult.count} avaliações órfãs excluídas`)
        }

        // ======================================================================
        // STEP 2: Delete inactive/archived workouts and their lessons (ALL studios)
        // ======================================================================
        console.log('🧹 [MIGRATE] Limpando treinos inativos...')

        const inactiveWorkouts = await prisma.workout.findMany({
            where: { isActive: false },
            select: { id: true },
        })

        if (inactiveWorkouts.length > 0) {
            const ids = inactiveWorkouts.map(w => w.id)

            const relatedLessons = await prisma.lesson.findMany({
                where: { workoutId: { in: ids } },
                select: { id: true },
            })
            const lessonIds = relatedLessons.map(l => l.id)

            if (lessonIds.length > 0) {
                const lcDeleted = await prisma.lessonClient.deleteMany({
                    where: { lessonId: { in: lessonIds } },
                })
                stats.lessonClientsDeleted += lcDeleted.count

                const lDeleted = await prisma.lesson.deleteMany({
                    where: { id: { in: lessonIds } },
                })
                stats.lessonsDeleted += lDeleted.count
            }

            const deleteResult = await prisma.workout.deleteMany({
                where: { id: { in: ids } },
            })
            stats.workoutsDeleted = deleteResult.count
            console.log(`   ✅ ${deleteResult.count} treinos inativos excluídos`)
        }

        // ======================================================================
        // STEP 3: Regenerate all ACTIVE workouts with new Juba exercises (ALL studios)
        // ======================================================================
        console.log('🔄 [MIGRATE] Regenerando treinos ativos com exercícios Juba...')

        const activeWorkouts = await prisma.workout.findMany({
            where: { isActive: true },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        lastPillarIndex: true,
                        level: true,
                        trainingDaysPerWeek: true,
                    },
                },
            },
        })

        console.log(`   📋 ${activeWorkouts.length} treinos ativos encontrados`)

        for (const workout of activeWorkouts) {
            try {
                const client = workout.client
                if (!client) {
                    const relatedLessons = await prisma.lesson.findMany({
                        where: { workoutId: workout.id },
                        select: { id: true },
                    })
                    if (relatedLessons.length > 0) {
                        const lIds = relatedLessons.map(l => l.id)
                        await prisma.lessonClient.deleteMany({ where: { lessonId: { in: lIds } } })
                        await prisma.lesson.deleteMany({ where: { id: { in: lIds } } })
                    }
                    await prisma.workout.delete({ where: { id: workout.id } })
                    stats.workoutsDeleted++
                    continue
                }

                const weeklyFrequency = workout.sessionsPerWeek || 3
                const targetWeeks = workout.targetWeeks || 8
                const lastPillarIndex = client.lastPillarIndex ?? 0

                const pillarSchedule = generatePillarRotation({
                    trainingDaysPerWeek: weeklyFrequency,
                    totalWeeks: targetWeeks,
                    lastPillarIndex,
                })

                const allPillars = pillarSchedule.schedule.flat()

                const template = generateWorkoutTemplate(
                    allPillars,
                    'saude',
                    weeklyFrequency,
                    targetWeeks,
                )

                const schedule = expandTemplateToSchedule(template, 'saude')

                await prisma.workout.update({
                    where: { id: workout.id },
                    data: {
                        scheduleJson: schedule,
                        templateJson: template as any,
                        name: `Programa ${PILLAR_LABELS[allPillars[0]]} - ${client.name}`,
                    },
                })

                await prisma.client.update({
                    where: { id: client.id },
                    data: {
                        lastPillarIndex: pillarSchedule.lastIndexAfterProgram,
                    },
                })

                stats.workoutsRegenerated++
                console.log(`   ✅ ${client.name}: treino regenerado (${allPillars.length} sessões)`)
            } catch (err: any) {
                const errorMsg = `Erro regenerando treino ${workout.id}: ${err.message}`
                stats.errors.push(errorMsg)
                console.error(`   ❌ ${errorMsg}`)
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'MIGRATE',
                entity: 'System',
                entityId: 'migrate-juba',
                newData: stats as any,
            },
        })

        console.log('✅ [MIGRATE] Migração completa!')
        console.log(`   Treinos regenerados: ${stats.workoutsRegenerated}`)
        console.log(`   Treinos excluídos: ${stats.workoutsDeleted}`)
        console.log(`   Avaliações excluídas: ${stats.assessmentsDeleted}`)
        console.log(`   Aulas excluídas: ${stats.lessonsDeleted}`)

        return NextResponse.json({
            success: true,
            data: stats,
        })
    } catch (error: any) {
        console.error('Migration error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro na migração: ' + error.message },
            { status: 500 }
        )
    }
}
