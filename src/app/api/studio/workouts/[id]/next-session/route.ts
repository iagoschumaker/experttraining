import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import {
    getNextSessionWithPeriodization,
    calculateProgress,
    WorkoutTemplate,
} from '@/services/workoutTemplate'

// Helpers para calcular início/fim do dia em horário de Brasília (UTC-3)
function getTodayRange() {
    // Obter data atual no fuso de Brasília
    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const year = nowBRT.getFullYear()
    const month = nowBRT.getMonth()
    const day = nowBRT.getDate()

    // Início e fim do dia em Brasília, convertido para UTC
    // Brasília = UTC-3, então 00:00 BRT = 03:00 UTC
    const start = new Date(Date.UTC(year, month, day, 3, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999))
    return { start, end }
}

// ============================================================================
// NORMALIZAR TEMPLATE — suporta formato novo (PhaseWorkoutTemplate) e legado
// ============================================================================
// Novo formato (gerado após migração para phaseWorkouts.ts):
//   templateJson = { treinos: [{ pillar, pillarLabel, blocos: [{name, exercises}], protocoloFinal }], preparations: [] }
// Legado (workoutTemplate.ts):
//   templateJson = { sessions: [{ pillar, pillarLabel, preparation: {}, blocks: [], finalProtocol: {} }] }
//
// Normaliza para o formato sessions[] usado pelo resto da API.
function normalizeTemplate(raw: any): WorkoutTemplate {
    // Already in sessions format
    if (raw && Array.isArray(raw.sessions) && raw.sessions.length > 0) {
        return raw as WorkoutTemplate
    }

    // ========================================================================
    // GESTANTE FORMAT: templateJson = GestantePhaseTemplate
    // { phase: 'GESTANTE_T1', session: {...}, phaseLabel, trimester, ... }
    // The `isGestante` flag is NOT in templateJson — detect by phase prefix or session field
    // ========================================================================
    if (raw && raw.session && (
        (typeof raw.phase === 'string' && raw.phase.startsWith('GESTANTE_')) ||
        raw.isGestante === true
    )) {
        const s = raw.session
        // Build a simplified session that the presença card can render
        const blocks = (s.blocks || []).map((b: any, i: number) => ({
            code: `G${i + 1}`,
            name: b.name || `Bloco ${i + 1}`,
            exercises: (b.exercises || []).map((ex: any) => ({
                name: ex.name || '',
                sets: ex.sets || 2,
                reps: ex.reps || '',
                rest: ex.rest || '60s',
                weight: null,
                blockIdx: i,
                exerciseIdx: 0,
                role: 'gestante',
                notes: ex.notes,
                caution: ex.caution,
            })),
        }))

        const preparation = s.warmup ? {
            title: s.warmup.name || 'Aquecimento Gestante',
            totalTime: s.warmup.duration || '10 min',
            exercises: (s.warmup.exercises || []).map((ex: any) => ({
                name: ex.name || '',
                sets: 1,
                reps: ex.reps || '',
                rest: '',
                role: 'warmup',
            })),
        } : null

        return {
            sessions: [({
                sessionIndex: 0,
                pillar: 'GESTANTE',
                pillarLabel: raw.phaseLabel || 'Sessão Gestante 🤰',
                preparation,
                blocks,
                finalProtocol: null,
                // Keep gestante raw for rich display
                isGestante: true,
                gestanteSession: s,
                phaseLabel: raw.phaseLabel,
                trimester: raw.trimester,
                gestationalWeeksRange: raw.gestationalWeeksRange,
                maxHeartRate: raw.maxHeartRate,
            }) as any],
            sessionsPerWeek: raw.sessionsPerWeek || 3,
            targetWeeks: raw.targetWeeks || 6,
            methodology: 'GESTANTE',
            pillarSystem: 'GESTANTE',
        }
    }

    // New PhaseWorkoutTemplate format: has treinos[]
    if (raw && Array.isArray(raw.treinos) && raw.treinos.length > 0) {
        const preparations: any[] = raw.preparations || []
        const sessions = raw.treinos.map((treino: any, i: number) => {
            // Map blocos → blocks, normalizing exercise fields
            const blocks = (treino.blocos || []).map((bloco: any) => ({
                code: bloco.name?.split(' ')[0] || `B${i + 1}`,
                name: bloco.name || `Bloco ${i + 1}`,
                exercises: (bloco.exercises || []).map((ex: any) => ({
                    name: ex.name || ex.nome || '',
                    sets: ex.series || ex.sets || 3,
                    reps: ex.reps || ex.repeticoes || '',
                    rest: ex.rest || ex.descanso || '',
                    weight: ex.weight || ex.carga || null,
                    blockIdx: i,
                    exerciseIdx: 0,
                    role: 'main',
                })),
            }))

            // Find matching preparation by index (Perna=0, Empurra=1, Puxa=2)
            const prepIdx = i % Math.max(preparations.length, 1)
            const prep = preparations[prepIdx] || preparations[0]
            const preparation = prep ? {
                title: prep.title || 'Aquecimento',
                totalTime: '12 min',
                exercises: (prep.exercises || []).map((ex: any) => ({
                    name: ex.name || ex.nome || '',
                    sets: 1,
                    reps: ex.detail || ex.reps || '',
                    rest: '',
                    role: 'warmup',
                })),
            } : null

            // Final protocol — treat empty string as "use series field or a default"
            const protocolStr = treino.protocoloFinal || treino.series || ''
            const finalProtocol = {
                name: 'Protocolo Final',
                totalTime: '6-8 min',
                structure: protocolStr || 'Protocolo de finalização — consulte o professor',
                exercises: [] as any[],
            }

            return {
                sessionIndex: i,
                pillar: treino.pillar,
                pillarLabel: treino.pillarLabel,
                preparation,
                blocks,
                finalProtocol,
                // Keep raw fields too
                blocos: treino.blocos,
                protocoloFinal: treino.protocoloFinal,
                series: treino.series,
            }
        })

        return {
            sessions,
            sessionsPerWeek: raw.sessionsPerWeek || 3,
            targetWeeks: raw.targetWeeks || 6,
            methodology: raw.methodology || 'EXPERT_PRO',
            pillarSystem: raw.pillarSystem || 'PERNA_EMPURRA_PUXA',
        }
    }

    // Fallback: empty template
    return { sessions: [], sessionsPerWeek: 3, targetWeeks: 6, methodology: 'EXPERT_PRO', pillarSystem: 'PPL' }
}



// ============================================================================
// GET - Retorna próxima sessão com periodização + check-in status do dia
// ============================================================================
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        const workout = await prisma.workout.findFirst({
            where: {
                id: params.id,
                studioId: auth.studioId,
            },
            include: {
                client: { select: { id: true, name: true } },
            },
        })

        if (!workout) {
            return NextResponse.json(
                { success: false, error: 'Treino não encontrado' },
                { status: 404 }
            )
        }

        if (!workout.isActive) {
            return NextResponse.json(
                { success: false, error: 'Este treino não está ativo' },
                { status: 400 }
            )
        }

        const rawTemplate = workout.templateJson as any

        if (!rawTemplate) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Este treino não possui template.',
                    legacyWorkout: true,
                },
                { status: 400 }
            )
        }

        // Normalize: supports both phaseWorkouts format {treinos[]} and legacy {sessions[]}
        const template = normalizeTemplate(rawTemplate)

        if (template.sessions.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Template sem sessões. Verifique o treino.',
                    legacyWorkout: true,
                },
                { status: 400 }
            )
        }

        // Verificar se já fez check-in hoje
        const { start, end } = getTodayRange()
        const todayLesson = await prisma.lesson.findFirst({
            where: {
                workoutId: workout.id,
                date: { gte: start, lte: end },
                status: 'COMPLETED',
            },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                startedAt: true,
                endedAt: true,
                focus: true,
                sessionIndex: true,
                weekIndex: true,
            },
        })

        const checkedInToday = !!todayLesson

        // Buscar última sessão ANTERIOR a hoje para mostrar ao professor
        const lastLesson = await prisma.lesson.findFirst({
            where: {
                workoutId: workout.id,
                date: { lt: start },   // antes do início do dia de hoje
                status: 'COMPLETED',
            },
            orderBy: { date: 'desc' },
            select: { id: true, date: true, focus: true, sessionIndex: true },
        })

        const { session, progress } = getNextSessionWithPeriodization(
            template,
            workout.sessionsCompleted,
            workout.startDate,
        )

        // Check if a specific session index was requested (pillar selector)
        const url = new URL(request.url)
        const requestedIndex = url.searchParams.get('sessionIndex')

        // Se já fez check-in hoje, mostrar a sessão que completou (não a próxima)
        let displaySession = session
        if (requestedIndex !== null) {
            // Trainer manually selected a pillar/session
            const idx = parseInt(requestedIndex, 10)
            if (idx >= 0 && idx < template.sessions.length) {
                displaySession = JSON.parse(JSON.stringify(template.sessions[idx]))
            }
        } else if (checkedInToday) {
            // sessionsCompleted já foi incrementado, então a sessão de hoje é a anterior
            const completedIdx = (workout.sessionsCompleted - 1) % template.sessions.length
            if (completedIdx >= 0 && completedIdx < template.sessions.length) {
                displaySession = template.sessions[completedIdx]
            }
        }

        // Build available sessions list for pillar selector
        const availableSessions = template.sessions.map((s, i) => ({
            index: i,
            pillarLabel: s.pillarLabel,
            pillar: s.pillar,
        }))

        return NextResponse.json({
            success: true,
            data: {
                session: displaySession,
                progress,
                client: workout.client,
                workoutName: workout.name,
                checkedInToday,
                availableSessions,
                todayLesson: todayLesson ? {
                    id: todayLesson.id,
                    date: todayLesson.date,
                    startedAt: todayLesson.startedAt,
                    endedAt: todayLesson.endedAt,
                    focus: todayLesson.focus,
                    sessionIndex: todayLesson.sessionIndex,
                    weekIndex: todayLesson.weekIndex,
                } : null,
                lastLesson: lastLesson ? {
                    id: lastLesson.id,
                    date: lastLesson.date,
                    focus: lastLesson.focus,
                    sessionIndex: lastLesson.sessionIndex,
                } : null,
            },
        })
    } catch (error) {
        console.error('Get next session error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar próxima sessão' },
            { status: 500 }
        )
    }
}

// ============================================================================
// POST - Registrar sessão completada (1x por dia)
// ============================================================================
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        const workout = await prisma.workout.findFirst({
            where: {
                id: params.id,
                studioId: auth.studioId,
                isActive: true,
            },
            include: {
                client: { select: { id: true, name: true } },
            },
        })

        if (!workout) {
            return NextResponse.json(
                { success: false, error: 'Treino ativo não encontrado' },
                { status: 404 }
            )
        }

        const template = normalizeTemplate(workout.templateJson as any)

        if (template.sessions.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Treino sem template' },
                { status: 400 }
            )
        }

        // ====================================================================
        // GUARD: Verificar se já fez check-in HOJE
        // ====================================================================
        const { start, end } = getTodayRange()
        const alreadyCheckedIn = await prisma.lesson.findFirst({
            where: {
                workoutId: workout.id,
                date: { gte: start, lte: end },
                status: 'COMPLETED',
            },
        })

        if (alreadyCheckedIn) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Presença já registrada hoje para este aluno.',
                    alreadyCheckedIn: true,
                },
                { status: 400 }
            )
        }

        // Calcular qual sessão está sendo completada (contínua, não reseta por semana)
        const sessionIndex = workout.sessionsCompleted % template.sessions.length
        const currentWeek = Math.floor(workout.sessionsCompleted / workout.sessionsPerWeek) + 1
        const session = template.sessions[sessionIndex]

        // Opcional: dados extras do body
        let bodyData: any = {}
        try {
            bodyData = await request.json()
        } catch {
            // Body vazio é ok
        }

        // Incrementar sessões + criar Lesson em transação
        const [updatedWorkout, lesson] = await prisma.$transaction([
            prisma.workout.update({
                where: { id: workout.id },
                data: {
                    sessionsCompleted: { increment: 1 },
                },
            }),
            prisma.lesson.create({
                data: {
                    studioId: auth.studioId,
                    trainerId: auth.userId,
                    type: 'INDIVIDUAL',
                    date: (() => {
                        // Usar data no horário de Brasília (UTC-3) para evitar offset de dia
                        const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
                        return new Date(nowBRT.getFullYear(), nowBRT.getMonth(), nowBRT.getDate(), 12, 0, 0)
                    })(),
                    startedAt: new Date(),
                    workoutId: workout.id,
                    weekIndex: currentWeek,
                    dayIndex: sessionIndex + 1,
                    sessionIndex,
                    focus: session?.pillarLabel || null,
                    notes: bodyData.notes || null,
                    status: 'COMPLETED',
                    endedAt: new Date(),
                    duration: bodyData.duration || 60,
                    clients: {
                        create: {
                            clientId: workout.clientId,
                            attended: true,
                        },
                    },
                },
            }),
        ])

        // Calcular progresso atualizado
        const progress = calculateProgress(
            updatedWorkout.sessionsCompleted,
            updatedWorkout.sessionsPerWeek,
            updatedWorkout.targetWeeks,
            updatedWorkout.startDate,
        )

        console.log(`✅ Sessão registrada: ${workout.client.name}`)
        console.log(`   - Sessão ${updatedWorkout.sessionsCompleted}/${updatedWorkout.targetWeeks * updatedWorkout.sessionsPerWeek}`)
        console.log(`   - Semana ${progress.currentWeek}/${progress.targetWeeks}`)
        console.log(`   - Frequência: ${progress.attendanceRateLabel}`)
        console.log(`   - Fase: ${progress.currentPhaseLabel}`)
        console.log(`   - Apto reavaliação: ${progress.canReassess}`)

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: auth.userId,
                studioId: auth.studioId,
                action: 'COMPLETE_SESSION',
                entity: 'Workout',
                entityId: workout.id,
                newData: {
                    sessionIndex,
                    weekIndex: currentWeek,
                    sessionsCompleted: updatedWorkout.sessionsCompleted,
                    phase: progress.currentPhase,
                    attendanceRate: progress.attendanceRate,
                    lessonId: lesson.id,
                } as any,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                lessonId: lesson.id,
                progress,
                client: workout.client,
                session: {
                    pillarLabel: session?.pillarLabel,
                    sessionIndex,
                    weekIndex: currentWeek,
                },
                checkedInAt: new Date().toISOString(),
            },
        })
    } catch (error) {
        console.error('Complete session error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao registrar sessão' },
            { status: 500 }
        )
    }
}
