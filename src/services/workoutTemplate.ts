// ============================================================================
// MÉTODO EXPERT TRAINING — SERVIÇO DE TEMPLATE DE TREINO
// ============================================================================
// Template fixo de sessões + periodização por fase + controle de frequência 85%
// ============================================================================

import { Pillar, PILLAR_LABELS } from './pillarRotation'
import {
    generateBlocks,
    getPreparationExercises,
    generateFinalProtocol,
    BlockPrescription,
    PreparationExercise,
} from './pillarExercises'

// ============================================================================
// TIPOS
// ============================================================================

export interface SessionTemplate {
    sessionIndex: number
    pillar: Pillar
    pillarLabel: string
    preparation: {
        title: string
        totalTime: string
        exercises: PreparationExercise[]
    }
    blocks: BlockPrescription[]
    finalProtocol: {
        name: string
        totalTime: string
        structure: string
        exercises?: { name: string; duration: string; rest: string }[]
    }
}

export interface WorkoutTemplate {
    sessions: SessionTemplate[]
    sessionsPerWeek: number
    targetWeeks: number
    methodology: string
    pillarSystem: string
}

export interface WorkoutProgress {
    sessionsCompleted: number
    sessionsPerWeek: number
    targetWeeks: number
    currentWeek: number
    currentPhase: string
    currentPhaseLabel: string
    attendanceRate: number
    attendanceRateLabel: string
    attendanceStatus: 'ON_TRACK' | 'BELOW_TARGET' | 'CRITICAL'
    sessionsExpectedByNow: number
    sessionsForMinimumPhase: number
    canReassess: boolean
    mustExtend: boolean
    isComplete: boolean
    nextSessionIndex: number
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIN_WEEKS = 6
const MAX_WEEKS = 8
const ATTENDANCE_THRESHOLD = 0.85

// ============================================================================
// GERAÇÃO DO TEMPLATE
// ============================================================================

/**
 * Gera o template de sessões fixas (1 semana) baseado no rodízio de pilares.
 * Os exercícios gerados aqui são os MESMOS durante todo o programa.
 */
export function generateWorkoutTemplate(
    pillarSchedule: Pillar[],
    primaryGoal: string,
    sessionsPerWeek: number,
    targetWeeks: number = MAX_WEEKS,
): WorkoutTemplate {
    const sessions: SessionTemplate[] = pillarSchedule.map((pillar, sessionIndex) => {
        // Preparação contextualizada ao pilar
        const prepExercises = getPreparationExercises(pillar, sessionIndex)

        // 3 Blocos — gerados com weekIndex=0, sessão fixa
        // A periodização será aplicada DEPOIS, em runtime
        const blocks = generateBlocks(pillar, 0, sessionIndex, 'DEVELOPMENT')

        // Protocolo final baseado no objetivo
        const finalProtocol = generateFinalProtocol(primaryGoal, 'DEVELOPMENT')

        return {
            sessionIndex,
            pillar,
            pillarLabel: PILLAR_LABELS[pillar],
            preparation: {
                title: 'Preparação do Movimento',
                totalTime: '12 minutos',
                exercises: prepExercises,
            },
            blocks,
            finalProtocol,
        }
    })

    return {
        sessions,
        sessionsPerWeek,
        targetWeeks: Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, targetWeeks)),
        methodology: 'Método EXPERT PRO TRAINING',
        pillarSystem: 'LOWER → PUSH → PULL (rodízio circular)',
    }
}

// ============================================================================
// CÁLCULO DE PROGRESSO
// ============================================================================

/**
 * Calcula o progresso completo do aluno no programa.
 */
export function calculateProgress(
    sessionsCompleted: number,
    sessionsPerWeek: number,
    targetWeeks: number,
    startDate?: Date | null,
): WorkoutProgress {
    // Semana atual baseada em sessões completadas (não calendário)
    const currentWeek = Math.floor(sessionsCompleted / sessionsPerWeek) + 1

    // Fase atual
    const currentPhase = calculatePhase(currentWeek, targetWeeks)
    const phaseLabels: Record<string, string> = {
        ADAPTATION: 'Adaptação',
        DEVELOPMENT: 'Desenvolvimento',
        PEAK: 'Pico',
    }

    // Semanas reais transcorridas (por calendário) para cálculo de frequência
    let weeksElapsed = currentWeek
    if (startDate) {
        const now = new Date()
        const diffMs = now.getTime() - startDate.getTime()
        const calendarWeeks = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
        weeksElapsed = calendarWeeks
    }

    // Taxa de frequência: sessões feitas vs sessões esperadas por calendário
    const sessionsExpectedByNow = weeksElapsed * sessionsPerWeek
    const attendanceRate = sessionsExpectedByNow > 0
        ? Math.min(1, sessionsCompleted / sessionsExpectedByNow)
        : 0

    // Status de frequência
    let attendanceStatus: WorkoutProgress['attendanceStatus'] = 'ON_TRACK'
    if (attendanceRate < 0.70) {
        attendanceStatus = 'CRITICAL'
    } else if (attendanceRate < ATTENDANCE_THRESHOLD) {
        attendanceStatus = 'BELOW_TARGET'
    }

    // Sessões mínimas para a fase de 6 semanas (85%)
    const sessionsForMinPhase = Math.ceil(MIN_WEEKS * sessionsPerWeek * ATTENDANCE_THRESHOLD)

    // Pode reavaliar?
    const totalSessionsTarget = targetWeeks * sessionsPerWeek
    const minSessionsForReassess = Math.ceil(MIN_WEEKS * sessionsPerWeek * ATTENDANCE_THRESHOLD)
    const canReassess = (
        currentWeek >= MIN_WEEKS && attendanceRate >= ATTENDANCE_THRESHOLD
    ) || currentWeek > MAX_WEEKS

    // Precisa estender?
    const mustExtend = currentWeek >= MIN_WEEKS && currentWeek <= MAX_WEEKS && attendanceRate < ATTENDANCE_THRESHOLD

    // Programa completo?
    const isComplete = sessionsCompleted >= totalSessionsTarget || currentWeek > MAX_WEEKS

    // Próxima sessão no template (contínua, não reseta por semana)
    // sessionsPerWeek * targetWeeks = total de sessões no template
    const totalTemplateSessions = sessionsPerWeek * targetWeeks
    const nextSessionIndex = totalTemplateSessions > 0 ? sessionsCompleted % totalTemplateSessions : 0

    return {
        sessionsCompleted,
        sessionsPerWeek,
        targetWeeks,
        currentWeek: Math.min(currentWeek, MAX_WEEKS + 1),
        currentPhase,
        currentPhaseLabel: phaseLabels[currentPhase] || 'Desenvolvimento',
        attendanceRate,
        attendanceRateLabel: `${Math.round(attendanceRate * 100)}%`,
        attendanceStatus,
        sessionsExpectedByNow,
        sessionsForMinimumPhase: sessionsForMinPhase,
        canReassess,
        mustExtend,
        isComplete,
        nextSessionIndex,
    }
}

/**
 * Calcula a fase do programa baseada na semana atual.
 */
export function calculatePhase(currentWeek: number, targetWeeks: number): string {
    if (currentWeek <= 2) return 'ADAPTATION'
    if (currentWeek <= Math.ceil(targetWeeks * 2 / 3)) return 'DEVELOPMENT'
    return 'PEAK'
}

// ============================================================================
// SESSÃO COM PERIODIZAÇÃO
// ============================================================================

/**
 * Retorna a próxima sessão do template com periodização aplicada para a fase atual.
 * Os EXERCÍCIOS são sempre os mesmos — apenas séries/reps/descanso mudam.
 */
export function getNextSessionWithPeriodization(
    template: WorkoutTemplate,
    sessionsCompleted: number,
    startDate?: Date | null,
): { session: SessionTemplate; progress: WorkoutProgress } {
    const progress = calculateProgress(
        sessionsCompleted,
        template.sessionsPerWeek,
        template.targetWeeks,
        startDate,
    )

    // Pegar sessão do template usando índice contínuo
    // O template agora tem sessions.length = sessionsPerWeek * targetWeeks
    const sessionIndex = sessionsCompleted % template.sessions.length
    const baseSession = template.sessions[sessionIndex]
    if (!baseSession) {
        throw new Error(`Sessão ${progress.nextSessionIndex} não encontrada no template`)
    }

    // Clonar e aplicar periodização
    const session: SessionTemplate = JSON.parse(JSON.stringify(baseSession))

    // Aplicar ajustes de periodização nos blocos
    session.blocks = session.blocks.map(block => ({
        ...block,
        exercises: block.exercises.map(ex => applyPhasePeriodization(ex, progress.currentPhase)),
    }))

    return { session, progress }
}

/**
 * Aplica periodização a um exercício baseado na fase.
 */
function applyPhasePeriodization(
    exercise: any,
    phase: string,
): any {
    const adjusted = { ...exercise }

    if (phase === 'ADAPTATION') {
        adjusted.sets = Math.max(2, (adjusted.sets || 3) - 1)
        adjusted.reps = adjustRepsForPhase(adjusted.reps, 'up')
        adjusted.rest = adjustRestForPhase(adjusted.rest, 'up')
    } else if (phase === 'PEAK') {
        adjusted.sets = Math.min(4, (adjusted.sets || 3) + 1)
        adjusted.reps = adjustRepsForPhase(adjusted.reps, 'down')
        adjusted.rest = adjustRestForPhase(adjusted.rest, 'down')
    }
    // DEVELOPMENT = padrão, sem ajustes

    return adjusted
}

function adjustRepsForPhase(reps: string, direction: 'up' | 'down'): string {
    const match = reps?.match(/^(\d+)-(\d+)$/)
    if (match) {
        const low = parseInt(match[1])
        const high = parseInt(match[2])
        if (direction === 'up') return `${low + 2}-${high + 2}`
        return `${Math.max(4, low - 2)}-${Math.max(6, high - 2)}`
    }
    const matchEach = reps?.match(/^(\d+)\s+cada$/)
    if (matchEach) {
        const val = parseInt(matchEach[1])
        if (direction === 'up') return `${val + 2} cada`
        return `${Math.max(4, val - 2)} cada`
    }
    return reps
}

function adjustRestForPhase(rest: string, direction: 'up' | 'down'): string {
    const match = rest?.match(/^(\d+)-(\d+)s$/)
    if (match) {
        const low = parseInt(match[1])
        const high = parseInt(match[2])
        if (direction === 'up') return `${low + 15}-${high + 15}s`
        return `${Math.max(15, low - 15)}-${Math.max(30, high - 15)}s`
    }
    return rest
}

// ============================================================================
// SCHEDULE EXPANDIDO (para compatibilidade com UI e PDF)
// ============================================================================

/**
 * Expande o template em um scheduleJson completo para compatibilidade
 * com a UI existente (exibição de semanas) e geração de PDF.
 */
export function expandTemplateToSchedule(
    template: WorkoutTemplate,
    primaryGoal: string,
): any {
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const optimalDays =
        template.sessionsPerWeek === 2 ? ['Segunda', 'Quinta'] :
            template.sessionsPerWeek === 3 ? ['Segunda', 'Quarta', 'Sexta'] :
                template.sessionsPerWeek === 4 ? ['Segunda', 'Terça', 'Quinta', 'Sexta'] :
                    template.sessionsPerWeek === 5 ? ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] :
                        weekDays.slice(0, template.sessionsPerWeek)

    const schedule: any = {
        weeklyFrequency: template.sessionsPerWeek,
        phaseDuration: template.targetWeeks,
        methodology: template.methodology,
        pillarSystem: template.pillarSystem,
        structure: {
            preparation: 'Preparação do Movimento (12 min)',
            blocks: '3 blocos obrigatórios (3 exercícios cada)',
            protocol: 'Protocolo Final (6-8 min)',
        },
        weeks: [],
    }

    for (let week = 0; week < template.targetWeeks; week++) {
        const phase = calculatePhase(week + 1, template.targetWeeks)
        const phaseLabel = phase === 'ADAPTATION' ? 'Adaptação' :
            phase === 'DEVELOPMENT' ? 'Desenvolvimento' : 'Pico'

        const weekSchedule: any = {
            week: week + 1,
            phase,
            phaseLabel,
            sessions: template.sessions.map((session, idx) => {
                // Clonar e aplicar periodização para esta semana
                const periodizedBlocks = session.blocks.map(block => ({
                    ...block,
                    exercises: block.exercises.map(ex => applyPhasePeriodization({ ...ex }, phase)),
                }))

                const prepTime = 12
                const blocksTime = 45
                const protocolTime = parseInt(session.finalProtocol.totalTime) || 6
                const totalDuration = prepTime + blocksTime + protocolTime

                return {
                    session: idx + 1,
                    day: optimalDays[idx] || weekDays[idx],
                    pillar: session.pillar,
                    pillarLabel: session.pillarLabel,
                    focus: session.pillarLabel,
                    estimatedDuration: totalDuration,
                    preparation: session.preparation,
                    blocks: periodizedBlocks,
                    finalProtocol: session.finalProtocol,
                }
            }),
        }

        schedule.weeks.push(weekSchedule)
    }

    return schedule
}
