// ============================================================================
// EXPERT PRO TRAINING - SEED JUBA EXERCISES API
// ============================================================================
// POST - Seeds the exercise database with Método Juba exercises
// Only accessible by SuperAdmin, clears existing and re-seeds
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySuperAdmin } from '@/lib/auth/protection'

interface ExerciseSeed {
    name: string
    type: string       // LOWER, PUSH, PULL, CORE, CONDITIONING, PREPARATION
    muscleGroup: string
    equipment: string | null
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    defaultSets: number
    defaultReps: string
    defaultRest: string
    description?: string
}

// ============================================================================
// EXERCÍCIOS JUBA - COMPLETOS
// ============================================================================

const JUBA_EXERCISES: ExerciseSeed[] = [
    // =========================================================================
    // LOWER - INICIANTE
    // =========================================================================
    { name: 'Agachamento Goblet KB', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Kettlebell', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Agachamento Box', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Box', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Subida Box', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Box', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Afundo', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Lunge Regress', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Retrocesso Alternado', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Hexa Bar', type: 'LOWER', muscleGroup: 'Posterior / Glúteos', equipment: 'Barra', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'Terra KB', type: 'LOWER', muscleGroup: 'Posterior / Glúteos', equipment: 'Kettlebell', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },

    // LOWER - INTERMEDIÁRIO
    { name: 'Agachamento Box Unilateral', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Box', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Subida Box 2KB', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Box / Kettlebell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Afundo Búlgaro', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Lunge Alternado', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Reverse Lunge Slide', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Slide', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Stiff Unilateral KB', type: 'LOWER', muscleGroup: 'Posterior / Glúteos', equipment: 'Kettlebell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Leg Press', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },

    // LOWER - AVANÇADO
    { name: 'Agachamento Salto DB', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'Afundo Pliométrico', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Lunge com Salto', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: null, difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Salto Vertical DB', type: 'LOWER', muscleGroup: 'Quadríceps / Glúteos', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },

    // =========================================================================
    // PUSH - INICIANTE
    // =========================================================================
    { name: 'Flexão de Braço', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Flexão de Braço TRX', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: 'TRX', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },

    // PUSH - INTERMEDIÁRIO
    { name: 'Flexão de Braço BOSU', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: 'BOSU', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Flexão de Braço Pé Box', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: 'Box', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'Flexão de Braço MB Alternada', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: 'Medicine Ball', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Push Press DB', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Push CB', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Press DB', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Press DB Unilateral', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Desenvolvimento DB', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },

    // PUSH - AVANÇADO
    { name: 'Flexão de Braço com Carga', type: 'PUSH', muscleGroup: 'Peitoral / Tríceps', equipment: null, difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'Push Press Explosivo', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'Desenvolvimento Alternado DB', type: 'PUSH', muscleGroup: 'Ombros / Tríceps', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },
    { name: 'Push + Pull', type: 'PUSH', muscleGroup: 'Peitoral / Costas', equipment: null, difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s', description: 'Combo empurrada + puxada' },
    { name: 'Push + Press', type: 'PUSH', muscleGroup: 'Peitoral / Ombros', equipment: null, difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s', description: 'Combo flexão + press' },
    { name: 'Push Unilateral + Press', type: 'PUSH', muscleGroup: 'Peitoral / Ombros', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s' },

    // =========================================================================
    // PULL - INICIANTE
    // =========================================================================
    { name: 'TRX Remada', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'TRX', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'TRX Inclinado', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'TRX', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Carry', type: 'PULL', muscleGroup: 'Costas / Core', equipment: 'Kettlebell', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '30-40m', defaultRest: '60-90s' },

    // PULL - INTERMEDIÁRIO
    { name: 'TRX Fly', type: 'PULL', muscleGroup: 'Costas / Ombros', equipment: 'TRX', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'TRX Pé Box', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'TRX / Box', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'TRX Y', type: 'PULL', muscleGroup: 'Costas / Ombros', equipment: 'TRX', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Remada Curvada DB', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },
    { name: 'Remada Alternada DB', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'Dumbbell', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '60-90s' },
    { name: 'Remada Corda', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'Corda Naval', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '60-90s' },

    // PULL - AVANÇADO
    { name: 'TRX Isométrico', type: 'PULL', muscleGroup: 'Costas / Core', equipment: 'TRX', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '20-30s', defaultRest: '60-90s' },
    { name: 'Remada Explosiva', type: 'PULL', muscleGroup: 'Costas / Bíceps', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '60-90s' },
    { name: 'TRX Isométrico + Press', type: 'PULL', muscleGroup: 'Costas / Ombros', equipment: 'TRX', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8 cada', defaultRest: '60-90s', description: 'Combo isometria + press' },

    // =========================================================================
    // CORE / ESTABILIDADE
    // =========================================================================
    { name: 'Prancha Alta', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '30-45s', defaultRest: '20-40s' },
    { name: 'Prancha Lateral', type: 'CORE', muscleGroup: 'Core / Oblíquos', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '20-30s cada', defaultRest: '20-40s' },
    { name: 'Prancha Alcance', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: null, difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },
    { name: 'Rigidez Fit Ball', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: 'Fit Ball', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '30-45s', defaultRest: '20-40s' },
    { name: 'Rigidez Aqua Ball', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: 'Aqua Ball', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '30-45s', defaultRest: '20-40s' },
    { name: 'Rigidez Elástico', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: 'Mini Band', difficulty: 'BEGINNER', defaultSets: 3, defaultReps: '30-45s', defaultRest: '20-40s' },

    { name: 'Prancha Alta com Alcance', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },
    { name: 'Prancha Dinâmica', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '20-40s' },
    { name: 'Prancha Toque Ombro', type: 'CORE', muscleGroup: 'Core / Anti-Rotação', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },
    { name: 'Rigidez Fit Ball Vai/Volta', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: 'Fit Ball', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '20-40s' },
    { name: 'Perdigueiro Inverso', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },
    { name: 'Pollof Press Elástico', type: 'CORE', muscleGroup: 'Core / Anti-Rotação', equipment: 'Mini Band', difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },

    { name: 'Ab X-Up', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: null, difficulty: 'INTERMEDIATE', defaultSets: 3, defaultReps: '10-12', defaultRest: '20-40s' },
    { name: 'Ab X-Up DB', type: 'CORE', muscleGroup: 'Core / Abdômen', equipment: 'Dumbbell', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '8-10', defaultRest: '20-40s' },
    { name: 'Rigidez Elástico Passo Lateral', type: 'CORE', muscleGroup: 'Core / Estabilidade', equipment: 'Mini Band', difficulty: 'ADVANCED', defaultSets: 3, defaultReps: '10 cada', defaultRest: '20-40s' },

    // =========================================================================
    // CONDICIONAMENTO
    // =========================================================================
    { name: 'Air Bike', type: 'CONDITIONING', muscleGroup: 'Cardio / Full Body', equipment: 'Air Bike', difficulty: 'BEGINNER', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },
    { name: 'Corda Naval', type: 'CONDITIONING', muscleGroup: 'Cardio / Upper Body', equipment: 'Corda Naval', difficulty: 'BEGINNER', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },
    { name: 'Climbers', type: 'CONDITIONING', muscleGroup: 'Cardio / Core', equipment: null, difficulty: 'BEGINNER', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },
    { name: 'Skipping', type: 'CONDITIONING', muscleGroup: 'Cardio / Lower', equipment: null, difficulty: 'BEGINNER', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },
    { name: 'Tração Esteira', type: 'CONDITIONING', muscleGroup: 'Cardio / Full Body', equipment: 'Esteira', difficulty: 'INTERMEDIATE', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },
    { name: 'Skater com Salto', type: 'CONDITIONING', muscleGroup: 'Cardio / Lower', equipment: null, difficulty: 'ADVANCED', defaultSets: 1, defaultReps: '30-60s', defaultRest: '30-60s' },

    // =========================================================================
    // MOBILIDADE / PREPARAÇÃO
    // =========================================================================
    { name: 'Reach Lateral', type: 'PREPARATION', muscleGroup: 'Mobilidade / Lateral', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10 cada', defaultRest: '-' },
    { name: 'Reach Front', type: 'PREPARATION', muscleGroup: 'Mobilidade / Frontal', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10', defaultRest: '-' },
    { name: 'Mobilidade de Quadril', type: 'PREPARATION', muscleGroup: 'Mobilidade / Quadril', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10 cada', defaultRest: '-' },
    { name: 'Mobilidade Torácica', type: 'PREPARATION', muscleGroup: 'Mobilidade / Torácica', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10 cada', defaultRest: '-' },
    { name: 'Mobilidade Geral', type: 'PREPARATION', muscleGroup: 'Mobilidade / Geral', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '60s', defaultRest: '-' },
    { name: 'Ativação de Core', type: 'PREPARATION', muscleGroup: 'Ativação / Core', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10 cada', defaultRest: '-' },
    { name: 'Estabilidade Articular', type: 'PREPARATION', muscleGroup: 'Ativação / Articular', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '10 cada', defaultRest: '-' },
    { name: 'Ativação Neuromuscular', type: 'PREPARATION', muscleGroup: 'Ativação / Neuromuscular', equipment: null, difficulty: 'BEGINNER', defaultSets: 2, defaultReps: '60s', defaultRest: '-' },
]

// POST - Seed all Juba exercises
export async function POST(request: NextRequest) {
    try {
        const adminPayload = await verifySuperAdmin()
        if (!adminPayload) {
            return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
        }

        // Delete all existing exercises first
        const deleted = await prisma.exercise.deleteMany({})

        // Insert all Juba exercises
        const created = await prisma.exercise.createMany({
            data: JUBA_EXERCISES.map((ex, idx) => ({
                name: ex.name,
                description: ex.description || null,
                type: ex.type,
                muscleGroup: ex.muscleGroup,
                equipment: ex.equipment,
                difficulty: ex.difficulty,
                defaultSets: ex.defaultSets,
                defaultReps: ex.defaultReps,
                defaultRest: ex.defaultRest,
                orderInBlock: idx,
                isActive: true,
                isLocked: true,
                createdBy: 'SUPERADMIN',
            })),
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: adminPayload.userId,
                action: 'CREATE',
                entity: 'Exercise',
                entityId: 'SEED_JUBA',
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                deleted: deleted.count,
                created: created.count,
                message: `${created.count} exercícios do Método Juba inseridos com sucesso`,
            },
        })
    } catch (error) {
        console.error('Seed exercises error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao semear exercícios' }, { status: 500 })
    }
}
