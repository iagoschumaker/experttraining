// ============================================================================
// MÉTODO EXPERT TRAINING — SERVIÇO DE TEMPLATE DE TREINO (Legado)
// ============================================================================
// Mantém calculateProgress, getNextSessionWithPeriodization e tipos
// usados por endpoints ativos (next-session, progress, workout detail).
//
// A geração de treinos agora é feita por phaseWorkouts.ts + trainingPhases.ts.
// ============================================================================

// ============================================================================
// TIPOS (usados em leitura de templateJson de treinos existentes)
// ============================================================================

export interface SessionTemplate {
    sessionIndex: number
    pillar: string
    pillarLabel: string
    preparation: {
        title: string
        totalTime: string
        exercises: any[]
    } | null
    blocks: any[]
    finalProtocol: {
        name: string
        totalTime: string
        structure: string
        exercises?: { name: string; duration: string; rest: string }[]
    } | null
}

export interface WorkoutTemplate {
    sessions: SessionTemplate[]
    sessionsPerWeek: number
    targetWeeks: number
    methodology: string
    pillarSystem: string
    pillarTemplates?: Record<string, any>
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
    const canReassess = (
        currentWeek >= MIN_WEEKS && attendanceRate >= ATTENDANCE_THRESHOLD
    ) || currentWeek > MAX_WEEKS

    // Precisa estender?
    const mustExtend = currentWeek >= MIN_WEEKS && currentWeek <= MAX_WEEKS && attendanceRate < ATTENDANCE_THRESHOLD

    // Programa completo?
    const isComplete = sessionsCompleted >= totalSessionsTarget || currentWeek > MAX_WEEKS

    // Próxima sessão no template (contínua, não reseta por semana)
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
    const sessionIndex = sessionsCompleted % template.sessions.length
    const baseSession = template.sessions[sessionIndex]
    if (!baseSession) {
        throw new Error(`Sessão ${progress.nextSessionIndex} não encontrada no template`)
    }

    // Clonar — a periodização já foi aplicada durante a geração
    const session: SessionTemplate = JSON.parse(JSON.stringify(baseSession))

    return { session, progress }
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
    _primaryGoal: string,
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

        const startIdx = week * template.sessionsPerWeek
        const endIdx = startIdx + template.sessionsPerWeek
        const weekSessions = template.sessions.slice(startIdx, endIdx)

        const weekSchedule: any = {
            week: week + 1,
            phase,
            phaseLabel,
            sessions: weekSessions.map((session, idx) => {
                const prepTime = 12
                const blocksTime = 45
                const protocolTime = parseInt(session.finalProtocol?.totalTime ?? '6') || 6
                const totalDuration = prepTime + blocksTime + protocolTime

                return {
                    session: idx + 1,
                    day: optimalDays[idx] || weekDays[idx],
                    pillar: session.pillar,
                    pillarLabel: session.pillarLabel,
                    focus: session.pillarLabel,
                    estimatedDuration: totalDuration,
                    preparation: session.preparation,
                    blocks: session.blocks,
                    finalProtocol: session.finalProtocol,
                }
            }),
        }

        schedule.weeks.push(weekSchedule)
    }

    return schedule
}
