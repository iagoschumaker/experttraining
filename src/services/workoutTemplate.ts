// ============================================================================
// MÉTODO EXPERT TRAINING — SERVIÇO DE TEMPLATE DE TREINO
// ============================================================================
// Template FIXO por pilar + periodização por fase + controle de frequência 85%
//
// REGRA DE CONSISTÊNCIA:
//   - Cada pilar (LOWER, PUSH, PULL) tem UM template fixo por ciclo
//   - Os exercícios são selecionados UMA VEZ e reutilizados em TODAS as
//     ocorrências dessa categoria no ciclo inteiro
//   - Apenas variáveis de progressão (reps, load, rest) mudam por semana
//   - ZERO repetição de exercício dentro da mesma sessão
// ============================================================================

import { Pillar, PILLAR_LABELS, PILLARS } from './pillarRotation'
import {
    ExerciseLevel,
    PainContext,
    generatePillarTemplate,
    applyWeeklyProgression,
    validateSessionExercises,
    getPreparationExercises,
    generateFinalProtocol,
    pickPillarFocos,
    assignTechniques,
    BlockPrescription,
    PreparationExercise,
    PillarTemplate,
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
    /** Templates fixos por pilar — gerados UMA VEZ e reutilizados */
    pillarTemplates: Record<string, PillarTemplate>
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
// GERAÇÃO DO TEMPLATE — 2 FASES: FOCOS PRIMEIRO, DEPOIS COMPLETO
// ============================================================================

/**
 * Gera o template de sessões com TEMPLATES FIXOS POR PILAR.
 * 
 * REGRA PRINCIPAL (2 FASES):
 * FASE 1: Reserva TODOS os exercícios FOCO de TODOS os pilares PRIMEIRO.
 *         Isso garante que secundários de um pilar não "roubem" focos de outro.
 * FASE 2: Gera templates completos com focos pré-atribuídos.
 *         Secundários e cores são selecionados ao redor dos focos já reservados.
 */
export function generateWorkoutTemplate(
    pillarSchedule: Pillar[],
    primaryGoal: string,
    sessionsPerWeek: number,
    targetWeeks: number = MAX_WEEKS,
    clientLevel: ExerciseLevel = 'BEGINNER',
    pain?: PainContext,
): WorkoutTemplate {
    // ======================================================================
    // FASE 1: Reservar FOCOS de TODOS os pilares PRIMEIRO
    // ======================================================================
    const uniquePillars = Array.from(new Set(pillarSchedule)) as Pillar[]
    const pillarTemplates: Record<string, PillarTemplate> = {}

    // Set GLOBAL que rastreia TODOS os exercícios usados em TODOS os pilares
    const globalUsedNames = new Set<string>()

    // Reservar os 3 FOCOs de cada pilar ANTES de gerar secundários/cores
    const pillarFocos: Record<string, any[]> = {}
    for (const pillar of uniquePillars) {
        const focos = pickPillarFocos(pillar, clientLevel, pain, globalUsedNames)
        pillarFocos[pillar] = focos
        focos.forEach(f => globalUsedNames.add(f.name))
        console.log(`🎯 FOCOs ${pillar} reservados: ${focos.map(f => f.name).join(', ')}`)
    }

    console.log(`📋 Total FOCOs reservados: ${globalUsedNames.size} exercícios`)

    // ======================================================================
    // FASE 2: Gerar templates completos com FOCOs pré-atribuídos
    // ======================================================================
    for (const pillar of uniquePillars) {
        const template = generatePillarTemplate(
            pillar, clientLevel, pain, globalUsedNames, pillarFocos[pillar]
        )
        
        // Adicionar todos os exercícios deste pilar ao set global
        for (const name of template.exerciseNames) {
            globalUsedNames.add(name)
        }
        
        // Validar: nenhum exercício duplicado no template
        const validation = validateSessionExercises(template.blocks)
        if (!validation.valid) {
            console.error(`⚠️ Template ${pillar} tem problemas:`, validation.errors)
        }
        
        pillarTemplates[pillar] = template
        console.log(`✅ Template ${pillar} gerado: ${template.exerciseNames.length} exercícios únicos (total global: ${globalUsedNames.size})`)
    }

    // ======================================================================
    // STEP 2: Gerar sessões reutilizando os templates fixos
    // ======================================================================
    const sessions: SessionTemplate[] = pillarSchedule.map((pillar, sessionIndex) => {
        const pillarTemplate = pillarTemplates[pillar]
        if (!pillarTemplate) {
            throw new Error(`Template não encontrado para pilar ${pillar}`)
        }

        // Calcular semana e fase desta sessão
        const weekIndex = Math.floor(sessionIndex / sessionsPerWeek)
        const weekPhase = calculatePhase(weekIndex + 1, targetWeeks)

        // Reutilizar o template FIXO, aplicando apenas progressão semanal
        let blocks = applyWeeklyProgression(pillarTemplate, weekIndex, weekPhase)

        // Aplicar técnicas de intensificação baseadas no nível do aluno
        blocks = assignTechniques(blocks, clientLevel)

        // Validação final anti-duplicidade
        const validation = validateSessionExercises(blocks)
        if (!validation.valid) {
            console.error(`⚠️ Sessão ${sessionIndex} (${pillar}) falhou validação:`, validation.errors)
        }

        // Preparação contextualizada ao pilar (variação por sessão é OK aqui)
        const prepExercises = getPreparationExercises(pillar, sessionIndex)

        // Protocolo final baseado no objetivo, fase, pilar E NÍVEL
        const finalProtocol = generateFinalProtocol(primaryGoal, weekPhase, pillar, clientLevel)

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
        pillarTemplates,
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
    // (os blocos já contêm as reps/load corretas para cada semana)
    const session: SessionTemplate = JSON.parse(JSON.stringify(baseSession))

    return { session, progress }
}

// ============================================================================
// SCHEDULE EXPANDIDO (para compatibilidade com UI e PDF)
// ============================================================================

/**
 * Expande o template em um scheduleJson completo para compatibilidade
 * com a UI existente (exibição de semanas) e geração de PDF.
 * 
 * REGRA: usa os mesmos blocos que já estão no template (já periodizados).
 * NÃO recalcula exercícios. Estrutura é idêntica ao template.
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

        // Pegar as sessões DESTA semana (fatia do template completo)
        const startIdx = week * template.sessionsPerWeek
        const endIdx = startIdx + template.sessionsPerWeek
        const weekSessions = template.sessions.slice(startIdx, endIdx)

        const weekSchedule: any = {
            week: week + 1,
            phase,
            phaseLabel,
            sessions: weekSessions.map((session, idx) => {
                // Blocos já vêm periodizados do template — NÃO recalcular
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
                    blocks: session.blocks,
                    finalProtocol: session.finalProtocol,
                }
            }),
        }

        schedule.weeks.push(weekSchedule)
    }

    return schedule
}
