// ============================================================================
// MÉTODO EXPERT TRAINING — BANCO DE EXERCÍCIOS POR PILAR
// ============================================================================
// MÉTODO JUBA — Exercícios reais das planilhas do Expert Training
//
// REGRA DE NÍVEL (OBRIGATÓRIA):
//   BEGINNER     → só exercícios level='BEGINNER'
//   INTERMEDIATE → level='BEGINNER' + 'INTERMEDIATE'
//   ADVANCED     → level='BEGINNER' + 'INTERMEDIATE' + 'ADVANCED'
//
// REGRA DE BLOCOS: Cada bloco tem 3 exercícios:
//   Ex1 (Foco)       → Obrigatoriamente do PILAR DO DIA
//   Ex2 (Secundário) → De um pilar DIFERENTE (opositor)
//   Ex3 (Core)       → Exercício neutro de core/estabilidade
//
// Bloco 1 → Ex2 vem do opositor A (ex: PUSH)
// Bloco 2 → Ex2 vem do opositor B (ex: PULL)
// Bloco 3 → Ex2 alterna entre A e B para variação
// ============================================================================

import { Pillar, PILLARS } from './pillarRotation'

// ============================================================================
// TIPOS
// ============================================================================

export type ExerciseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type ExerciseSlot = 'FOCO_PRINCIPAL' | 'SECUNDARIO' | 'CORE'

// Regiões corporais para contraindications
export type BodyRegion = 'KNEE' | 'LOWER_BACK' | 'SHOULDER' | 'HIP' | 'ANKLE' | 'WRIST' | 'NECK' | 'IMPACT'

/**
 * Contexto de dor/lesão do aluno (vem do painMap da avaliação).
 * Valores de 0-10. Valores >= 5 são considerados significativos.
 */
export interface PainContext {
    knee: number       // max(knee_left, knee_right)
    lowerBack: number  // lower_back
    shoulder: number   // max(shoulder_left, shoulder_right)
    hip: number        // max(hip_left, hip_right)
    ankle: number      // max(ankle_left, ankle_right)
    wrist: number      // max(wrist_left, wrist_right)
    neck: number       // neck
}

/** Limiar de dor para bloquear exercício */
const PAIN_THRESHOLD = 5

/**
 * Cria PainContext a partir do painMap da avaliação.
 */
export function buildPainContext(painMap: Record<string, number> | null | undefined): PainContext {
    const pm = painMap || {}
    return {
        knee: Math.max(pm.knee_left || 0, pm.knee_right || 0, pm.knee || 0),
        lowerBack: pm.lower_back || 0,
        shoulder: Math.max(pm.shoulder_left || 0, pm.shoulder_right || 0, pm.shoulder || 0),
        hip: Math.max(pm.hip_left || 0, pm.hip_right || 0),
        ankle: Math.max(pm.ankle_left || 0, pm.ankle_right || 0),
        wrist: Math.max(pm.wrist_left || 0, pm.wrist_right || 0),
        neck: pm.neck || 0,
    }
}

export interface ExercisePrescription {
    name: string
    sets: number
    reps: string
    rest: string
    role: ExerciseSlot
    level: ExerciseLevel
    /** Regiões corporais que contraindicam este exercício */
    contraindications?: BodyRegion[]
    // Weekly progression (Juba method: S1→S6)
    weeklyReps?: string[]  // e.g. ['12','12','10','10','8','8']
    weeklyLoad?: string[]  // e.g. ['livre','livre','75%','75%','80%','80%']
}

export interface PreparationExercise {
    name: string
    sets: number
    reps: string
    duration: string
}

export interface BlockPrescription {
    blockIndex: number
    name: string
    description: string
    restAfterBlock: string
    exercises: ExercisePrescription[]
}

export interface SessionPrescription {
    session: number
    day: string
    pillar: Pillar
    pillarLabel: string
    focus: string
    estimatedDuration: number
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

// ============================================================================
// FILTRAGEM POR NÍVEL — REGRA OBRIGATÓRIA
// ============================================================================

/**
 * Mapeia nível do cliente (PT-BR) para nível de exercício (EN)
 */
export function mapClientLevel(clientLevel: string): ExerciseLevel {
    switch (clientLevel) {
        case 'AVANCADO': return 'ADVANCED'
        case 'INTERMEDIARIO': return 'INTERMEDIATE'
        case 'INICIANTE':
        default: return 'BEGINNER'
    }
}

/**
 * Retorna os níveis de exercício permitidos para o nível do aluno.
 *
 * REGRA DE OURO:
 *   BEGINNER     → só ['BEGINNER']
 *   INTERMEDIATE → ['BEGINNER', 'INTERMEDIATE']
 *   ADVANCED     → ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
 *
 * NUNCA usar exercício ADVANCED para aluno BEGINNER ou INTERMEDIATE.
 */
function getAllowedLevels(clientLevel: ExerciseLevel): ExerciseLevel[] {
    switch (clientLevel) {
        case 'ADVANCED': return ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
        case 'INTERMEDIATE': return ['BEGINNER', 'INTERMEDIATE']
        case 'BEGINNER':
        default: return ['BEGINNER']
    }
}

/**
 * Filtra exercícios por nível do aluno. Se não houver exercícios no nível
 * permitido, retorna os de nível mais próximo inferior (fallback seguro).
 */
function filterByLevel(
    exercises: ExercisePrescription[],
    clientLevel: ExerciseLevel
): ExercisePrescription[] {
    const allowed = getAllowedLevels(clientLevel)
    const filtered = exercises.filter(ex => allowed.includes(ex.level))

    if (filtered.length > 0) return filtered

    // Fallback: se não há exercícios no nível, usar BEGINNER
    const fallback = exercises.filter(ex => ex.level === 'BEGINNER')
    if (fallback.length > 0) return fallback

    // Último recurso: retornar o primeiro exercício (não deveria chegar aqui)
    console.warn('⚠️ filterByLevel: sem exercícios compatíveis, usando fallback')
    return exercises.slice(0, 1)
}

/**
 * Filtra exercícios que são contraindicados pelas dores/lesões do aluno.
 * Um exercício é bloqueado se tem uma contraindication cuja dor >= PAIN_THRESHOLD.
 */
function filterByInjuries(
    exercises: ExercisePrescription[],
    pain: PainContext | undefined
): ExercisePrescription[] {
    if (!pain) return exercises

    const regionToScore: Record<BodyRegion, number> = {
        KNEE: pain.knee,
        LOWER_BACK: pain.lowerBack,
        SHOULDER: pain.shoulder,
        HIP: pain.hip,
        ANKLE: pain.ankle,
        WRIST: pain.wrist,
        NECK: pain.neck,
        IMPACT: Math.max(pain.knee, pain.ankle, pain.hip), // impacto afeta joelho/tornozelo/quadril
    }

    const filtered = exercises.filter(ex => {
        if (!ex.contraindications || ex.contraindications.length === 0) return true
        // Bloquear se QUALQUER contraindication tem dor >= threshold
        return !ex.contraindications.some(region => regionToScore[region] >= PAIN_THRESHOLD)
    })

    if (filtered.length > 0) return filtered

    // Fallback: se todos foram removidos, retornar os sem contraindications
    const safe = exercises.filter(ex => !ex.contraindications || ex.contraindications.length === 0)
    if (safe.length > 0) return safe

    // Último recurso: retornar o primeiro
    console.warn('⚠️ filterByInjuries: todos os exercícios contraindicados, usando fallback')
    return exercises.slice(0, 1)
}

/**
 * Filtro combinado: primeiro por nível, depois por lesões.
 */
function filterExercises(
    exercises: ExercisePrescription[],
    clientLevel: ExerciseLevel,
    pain?: PainContext
): ExercisePrescription[] {
    const byLevel = filterByLevel(exercises, clientLevel)
    return filterByInjuries(byLevel, pain)
}

// ============================================================================
// EXERCÍCIOS DE FOCO PRINCIPAL — POR PILAR × BLOCO
// ============================================================================
// Estes são SEMPRE o Ex1 do bloco — devem ser do PILAR DO DIA
// Exercícios da planilha Juba por nível progressivo

const FOCO_LOWER: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    // BLOCO 1 — SQUAT / AGACHAMENTO
    // BEGINNER: Afundo KB 3x 12/12/10/10/8/8 @ 60/60/70/70/80/80%
    // INTERMEDIATE: Leg Press Uni/Bilateral 3x 12/12/10/10/8/8
    // ADVANCED: Agachamento Box 3x 10/10/10/8/8/8
    bloco1: [
        // ── BEGINNER ──
        {
            name: 'Afundo KB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['KNEE'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
            weeklyLoad: ['60%', '60%', '70%', '70%', '80%', '80%'],
        },
        {
            name: 'Agachamento Goblet KB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['KNEE', 'HIP'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
            weeklyLoad: ['60%', '60%', '70%', '70%', '80%', '80%'],
        },
        {
            name: 'Agachamento Box', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['KNEE'],
            weeklyReps: ['10', '10', '10', '8', '8', '8'],
            weeklyLoad: ['livre', 'livre', 'livre', 'progressiva', 'progressiva', 'progressiva'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Afundo Búlgaro', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            contraindications: ['KNEE', 'HIP'],
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        {
            name: 'Leg Press Unilateral', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            contraindications: ['KNEE'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        // ── ADVANCED ──
        {
            name: 'Lunge Regress', sets: 3, reps: '8', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['KNEE'],
            weeklyReps: ['8', '8', '6', '6', '8', '8'],
            weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%'],
        },
        {
            name: 'Agachamento Salto DB', sets: 3, reps: '8', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['KNEE', 'HIP', 'LOWER_BACK', 'IMPACT'],
            weeklyReps: ['8', '8', '6', '6', '8', '8'],
            weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%'],
        },
    ],
    // BLOCO 2 — HINGE / SUBIDA BOX
    // BEGINNER: Subida Box 3x 12/12/10/10/8/8
    // INTERMEDIATE: Subida Box ou Stiff Unilateral 3x 10/10/8/8/8/8
    bloco2: [
        // ── BEGINNER ──
        {
            name: 'Subida Box', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['KNEE'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Terra KB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['LOWER_BACK'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
            weeklyLoad: ['60%', '60%', '70%', '70%', '80%', '80%'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Stiff Unilateral KB', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            contraindications: ['LOWER_BACK'],
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        {
            name: 'Subida Box 2KB', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        {
            name: 'Hexa Bar', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            contraindications: ['LOWER_BACK'],
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        // ── ADVANCED ──
        {
            name: 'Stiff Unilateral KB', sets: 3, reps: '8', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['LOWER_BACK'],
            weeklyReps: ['8', '8', '6', '6', '8', '8'],
            weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%'],
        },
    ],
    // BLOCO 3 — LUNGE / AFUNDO
    // BEGINNER: Afundo KB 3x 12/12/10/10/8/8 @ 60/60/70/70/80/80%
    // INTERMEDIATE: Búlgaro 3x 10/10/8/8/8/8
    // ADVANCED: Lunge Regress 3x 8/8/6/6/8/8
    bloco3: [
        // ── BEGINNER ──
        {
            name: 'Afundo KB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            contraindications: ['KNEE'],
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
            weeklyLoad: ['60%', '60%', '70%', '70%', '80%', '80%'],
        },
        {
            name: 'Retrocesso Alternado', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Lunge Alternado', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Afundo Búlgaro', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            contraindications: ['KNEE', 'HIP'],
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
            weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'],
        },
        {
            name: 'Reverse Lunge Slide', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['10', '10', '8', '8', '8', '8'],
        },
        // ── ADVANCED ──
        {
            name: 'Afundo Pliométrico', sets: 3, reps: '8', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['KNEE', 'HIP', 'ANKLE', 'IMPACT'],
            weeklyReps: ['8', '8', '6', '6', '8', '8'],
            weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%'],
        },
        {
            name: 'Lunge com Salto', sets: 3, reps: '8', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['KNEE', 'HIP', 'ANKLE', 'IMPACT'],
            weeklyReps: ['8', '8', '6', '6', '8', '8'],
            weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%']
        },
    ],
}

const FOCO_PUSH: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    // BLOCO 1 — EMPUR HORIZONTAL (Flexão)
    // BEGINNER:     Flexão de Braço 3x 12/12/10/10/8/8
    // INTERMEDIATE: Flexão BOSU/MB 3x 12/12/10/10/8/8
    // ADVANCED:     Flexão MB Alternada 3x 12/12/10/10/8/8
    bloco1: [
        // ── BEGINNER ──
        {
            name: 'Flexão de Braço', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Flexão de Braço TRX', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Flexão de Braço BOSU', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Flexão de Braço Pé Box', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── ADVANCED ──
        {
            name: 'Flexão de Braço MB Alternada', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Flexão de Braço com Carga', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
    ],
    // BLOCO 2 — PRESS / OVERHEAD
    // BEGINNER:     Push Press DB / Press DB 3x 12/12/10/10/8/8
    // INTERMEDIATE: Press DB Unilateral 3x 12/12/10/10/8/8
    // ADVANCED:     Push Press Explosivo 3x 12/12/10/10/10/10
    bloco2: [
        // ── BEGINNER ──
        {
            name: 'Push Press DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Press DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Desenvolvimento DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Push CB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Press DB Unilateral', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Desenvolvimento Alternado DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── ADVANCED ──
        {
            name: 'Push Press Explosivo', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['SHOULDER', 'WRIST'],
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
    ],
    // BLOCO 3 — INTEGRAÇÃO PUSH
    bloco3: [
        // ── BEGINNER ──
        {
            name: 'Flexão de Braço', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'Push Press DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Flexão de Braço BOSU', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── ADVANCED ──
        {
            name: 'Push + Pull', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'Push + Press', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
    ],
}

const FOCO_PULL: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    // BLOCO 1 — TRX
    // BEGINNER:     TRX Neutro 3x 12/12/10/10/8/8
    // INTERMEDIATE: TRX Inclinado Aberto 3x 12/12/10/10/10/10
    // ADVANCED:     TRX Pé Box / TRX Isométrico 3x 12/12/10/10/10/10
    bloco1: [
        // ── BEGINNER ──
        {
            name: 'TRX Remada', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        {
            name: 'TRX Inclinado', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'TRX Inclinado Aberto', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'TRX Y', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'TRX Fly', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        // ── ADVANCED ──
        {
            name: 'TRX Pé Box', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'TRX Isométrico + Press', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
    ],
    // BLOCO 2 — REMADA
    // BEGINNER:     Remada Curvada DB 3x 12/12/10/10/8/8
    // INTERMEDIATE: Remada Alternada DB 3x 12/12/10/10/10/10
    // ADVANCED:     Remada Corda 3x 12/12/10/10/10/10
    bloco2: [
        // ── BEGINNER ──
        {
            name: 'Remada Curvada DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Remada Alternada DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'TRX Isométrico', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        // ── ADVANCED ──
        {
            name: 'Remada Corda', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        {
            name: 'Remada Explosiva', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            contraindications: ['LOWER_BACK', 'SHOULDER'],
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
    ],
    // BLOCO 3 — CARRY + INTEGRAÇÃO
    // BEGINNER:     TRX Remada / Remada Curvada / Carry
    // INTERMEDIATE: Meio Arremesso DB 3x 10/10/10/10/8/8
    // ADVANCED:     Remada Corda / TRX Pé Box
    bloco3: [
        // ── BEGINNER ──
        {
            name: 'TRX Remada', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER',
            weeklyReps: ['12', '12', '10', '10', '8', '8'],
        },
        { name: 'Carry', sets: 3, reps: '30-40m', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'BEGINNER' },
        // ── INTERMEDIATE ──
        {
            name: 'Meio Arremesso DB', sets: 3, reps: '10', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['10', '10', '10', '10', '8', '8'],
        },
        {
            name: 'Remada Alternada DB', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'INTERMEDIATE',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
        // ── ADVANCED ──
        {
            name: 'Remada Corda', sets: 3, reps: '12', rest: '60-90s', role: 'FOCO_PRINCIPAL', level: 'ADVANCED',
            weeklyReps: ['12', '12', '10', '10', '10', '10'],
        },
    ],
}

// ============================================================================
// EXERCÍCIOS SECUNDÁRIOS — POR PILAR OPOSITOR
// ============================================================================
// Quando o dia é LOWER, os exercícios secundários vêm de PUSH ou PULL
// Quando o dia é PUSH, os exercícios secundários vêm de LOWER ou PULL
// Quando o dia é PULL, os exercícios secundários vêm de LOWER ou PUSH

const SECUNDARIO: Record<Pillar, Record<Pillar, ExercisePrescription[]>> = {
    // Dia LOWER → secundários vêm de PUSH ou PULL
    LOWER: {
        LOWER: [], // nunca usado (não pode repetir o pilar do dia)
        PUSH: [
            { name: 'Flexão de Braço', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Flexão de Braço TRX', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Push Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Desenvolvimento DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Press DB Unilateral', sets: 3, reps: '10/10', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE' },
        ],
        PULL: [
            { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'TRX Inclinado', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'TRX Y', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE' },
            { name: 'Remada Alternada DB', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE' },
        ],
    },
    // Dia PUSH → secundários vêm de LOWER ou PULL
    PUSH: {
        LOWER: [
            { name: 'Agachamento Goblet KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE', 'HIP'] },
            { name: 'Agachamento Box', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
            { name: 'Afundo', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
            { name: 'Terra KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['LOWER_BACK'] },
            { name: 'Subida Box', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
            { name: 'Retrocesso Alternado', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Afundo Búlgaro', sets: 3, reps: '8 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE', contraindications: ['KNEE', 'HIP'] },
        ],
        PUSH: [], // nunca usado
        PULL: [
            { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'TRX Inclinado', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Carry', sets: 3, reps: '30-40m', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Remada Corda', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE' },
        ],
    },
    // Dia PULL → secundários vêm de LOWER ou PUSH
    PULL: {
        LOWER: [
            { name: 'Agachamento Goblet KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE', 'HIP'] },
            { name: 'Terra KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['LOWER_BACK'] },
            { name: 'Subida Box', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
            { name: 'Agachamento Box', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
            { name: 'Afundo Búlgaro', sets: 3, reps: '8 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'INTERMEDIATE', contraindications: ['KNEE', 'HIP'] },
            { name: 'Lunge Alternado', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER', contraindications: ['KNEE'] },
        ],
        PUSH: [
            { name: 'Flexão de Braço', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Push Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Desenvolvimento DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Flexão de Braço TRX', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
            { name: 'Push CB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO', level: 'BEGINNER' },
        ],
        PULL: [], // nunca usado
    },
}

// ============================================================================
// EXERCÍCIOS DE CORE — POR BLOCO
// ============================================================================
// Core é neutro, serve qualquer pilar
// Nível associado ao bloco (bloco1=BEGINNER, bloco2=INTERMEDIATE, bloco3=ADVANCED)

const CORE: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    // BLOCO 1 — Core BEGINNER: Rigidez + Prancha Reta
    // Rigidez: 15/15/12/12/10/10 | Prancha Reta: 20/20/25/25/30/30s
    bloco1: [
        // ── BEGINNER ──
        {
            name: 'Rigidez Elástico', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        {
            name: 'Prancha Reta', sets: 3, reps: '20s', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['20s', '20s', '25s', '25s', '30s', '30s'],
        },
        {
            name: 'Prancha Alta', sets: 3, reps: '20s', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['20s', '20s', '25s', '25s', '30s', '30s'],
        },
        {
            name: 'Rigidez Fit Ball', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        {
            name: 'Rigidez Aqua Ball', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Rigidez Elástico Ponta do Pé', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        // ── ADVANCED ──
        {
            name: 'Prancha Alta Anilha', sets: 3, reps: '25s', rest: '20-40s', role: 'CORE', level: 'ADVANCED',
            weeklyReps: ['25s', '25s', '30s', '30s', '30s', '30s'],
        },
    ],
    // BLOCO 2 — Core INTERMEDIATE: Rigidez Fit Ball Vai/Volta + Prancha Reta
    // Rigidez Vai/Volta: 15/15/12/12/10/10 | Prancha: 20/20/25/25/30/30s
    bloco2: [
        // ── BEGINNER (fallback) ──
        {
            name: 'Prancha Reta', sets: 3, reps: '20s', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['20s', '20s', '25s', '25s', '30s', '30s'],
        },
        {
            name: 'Rigidez Elástico', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        // ── INTERMEDIATE ──
        {
            name: 'Rigidez Fit Ball Vai/Volta', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        {
            name: 'Rigidez Elástico Ponta do Pé', sets: 3, reps: '15', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE',
            weeklyReps: ['15', '15', '12', '12', '10', '10'],
        },
        { name: 'Prancha Toque Ombro', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        { name: 'Perdigueiro Inverso', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        { name: 'Pollof Press Elástico', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        // ── ADVANCED ──
        {
            name: 'Prancha Alta Anilha', sets: 3, reps: '25s', rest: '20-40s', role: 'CORE', level: 'ADVANCED',
            weeklyReps: ['25s', '25s', '30s', '30s', '30s', '30s'],
        },
    ],
    // BLOCO 3 — Core ADVANCED: Ab X-Up + Prancha Lateral
    // Prancha Lateral: 20/20/25/25/30/30s
    bloco3: [
        // ── BEGINNER (fallback) ──
        {
            name: 'Prancha Lateral', sets: 3, reps: '20s', rest: '20-40s', role: 'CORE', level: 'BEGINNER',
            weeklyReps: ['20s', '20s', '25s', '25s', '30s', '30s'],
        },
        { name: 'Prancha Alcance', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'BEGINNER' },
        // ── INTERMEDIATE ──
        { name: 'Prancha Dinâmica', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        { name: 'Prancha Alta com Alcance', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        { name: 'Pollof Press Elástico', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'INTERMEDIATE' },
        // ── ADVANCED ──
        { name: 'Ab X-Up', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE', level: 'ADVANCED' },
        { name: 'Ab X-Up DB', sets: 3, reps: '8-10', rest: '20-40s', role: 'CORE', level: 'ADVANCED' },
        { name: 'Rigidez Elástico Passo Lateral', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE', level: 'ADVANCED' },
        {
            name: 'Prancha Alta Anilha', sets: 3, reps: '25s', rest: '20-40s', role: 'CORE', level: 'ADVANCED',
            weeklyReps: ['25s', '25s', '30s', '30s', '30s', '30s'],
        },
    ],
}

// ============================================================================
// PREPARAÇÃO DO MOVIMENTO — POR PILAR
// ============================================================================
// Exercícios Juba: Mobilidade / Preparação (neutros, sem filtro de nível)

const PREPARACAO_LOWER: PreparationExercise[][] = [
    [
        { name: 'Mobilidade de Quadril', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 1, reps: '60s', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade de Quadril', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '8', duration: '2 min' },
        { name: 'Skipping', sets: 1, reps: '30s', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Mobilidade de Quadril', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '8', duration: '2 min' },
        { name: 'Climbers', sets: 1, reps: '30s', duration: '2 min' },
    ],
]

const PREPARACAO_PUSH: PreparationExercise[][] = [
    [
        { name: 'Mobilidade Torácica', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 1, reps: '30s', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade Torácica', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Skipping', sets: 1, reps: '30s', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Mobilidade Torácica', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Climbers', sets: 1, reps: '30s', duration: '2 min' },
    ],
]

const PREPARACAO_PULL: PreparationExercise[][] = [
    [
        { name: 'Mobilidade Torácica', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '12', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 1, reps: '30s cada', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade Torácica', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Estabilidade Articular', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Reach Lateral', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Skipping', sets: 1, reps: '30s', duration: '2 min' },
    ],
    [
        { name: 'Mobilidade Geral', sets: 2, reps: '60s', duration: '2 min' },
        { name: 'Mobilidade Torácica', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Ativação de Core', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Ativação Neuromuscular', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Reach Front', sets: 2, reps: '8', duration: '2 min' },
        { name: 'Climbers', sets: 1, reps: '30s', duration: '2 min' },
    ],
]

// ============================================================================
// FUNÇÕES DE SELEÇÃO DE EXERCÍCIOS
// ============================================================================

const FOCO_MAP: Record<Pillar, Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]>> = {
    LOWER: FOCO_LOWER,
    PUSH: FOCO_PUSH,
    PULL: FOCO_PULL,
}

const PREP_MAP: Record<Pillar, PreparationExercise[][]> = {
    LOWER: PREPARACAO_LOWER,
    PUSH: PREPARACAO_PUSH,
    PULL: PREPARACAO_PULL,
}

/**
 * Retorna os 2 pilares opositores (diferentes do pilar do dia)
 */
function getOpposingPillars(pillar: Pillar): [Pillar, Pillar] {
    const others = PILLARS.filter(p => p !== pillar) as [Pillar, Pillar]
    return others
}

/**
 * Seleciona exercício de foco do pilar com seleção ESTÁVEL e DETERMINÍSTICA.
 * O mesmo bloco (bloco1/2/3) do mesmo pilar sempre retorna o mesmo exercício
 * independente da semana → garante que ao voltar ao pilar, o exercício é igual.
 *
 * @param blockAnchor    Índice offset do bloco (0,1,2) — estável por bloco dentro do template
 * @param usedNames      Conjunto de nomes já usados nesta sessão — para deduplicação
 */
export function getFocoExercise(
    pillar: Pillar,
    blockKey: 'bloco1' | 'bloco2' | 'bloco3',
    sessionIndex: number,
    weekIndex: number,
    clientLevel: ExerciseLevel = 'BEGINNER',
    pain?: PainContext,
    usedNames?: Set<string>
): ExercisePrescription {
    const allOptions = FOCO_MAP[pillar][blockKey]
    const options = filterExercises(allOptions, clientLevel, pain)
    // Seleção estável: baseada apenas no índice do bloco dentro do template
    // (sessionIndex aqui é o índice ABSOLUTO no pillarSchedule, não a semana)
    // Sem usar weekIndex para evitar que o exercício mude a cada semana nova
    const baseIdx = sessionIndex % options.length
    if (!usedNames || usedNames.size === 0) {
        return { ...options[baseIdx] }
    }
    // Evitar nome já usado nesta sessão
    for (let offset = 0; offset < options.length; offset++) {
        const candidate = options[(baseIdx + offset) % options.length]
        if (!usedNames.has(candidate.name)) {
            return { ...candidate }
        }
    }
    // Fallback: retornar o baseIdx mesmo se duplicado (não há alternativas)
    return { ...options[baseIdx] }
}

/**
 * Seleciona exercício secundário de um pilar OPOSITOR ao pilar do dia.
 * FILTRA POR NÍVEL DO ALUNO E LESÕES.
 */
export function getSecundarioExercise(
    dayPillar: Pillar,
    opposingPillar: Pillar,
    sessionIndex: number,
    weekIndex: number,
    blockNum: number,
    clientLevel: ExerciseLevel = 'BEGINNER',
    pain?: PainContext
): ExercisePrescription {
    const allOptions = SECUNDARIO[dayPillar][opposingPillar]
    if (allOptions.length === 0) {
        throw new Error(`Pilar opositor ${opposingPillar} é igual ao pilar do dia ${dayPillar}`)
    }
    const options = filterExercises(allOptions, clientLevel, pain)
    const idx = (sessionIndex + blockNum + weekIndex) % options.length
    return { ...options[idx] }
}

/**
 * Seleciona exercício de core com variação.
 * FILTRA POR NÍVEL DO ALUNO E LESÕES.
 */
export function getCoreExercise(
    blockKey: 'bloco1' | 'bloco2' | 'bloco3',
    sessionIndex: number,
    weekIndex: number,
    blockNum: number,
    clientLevel: ExerciseLevel = 'BEGINNER',
    pain?: PainContext
): ExercisePrescription {
    const allOptions = CORE[blockKey]
    const options = filterExercises(allOptions, clientLevel, pain)
    const idx = (sessionIndex + blockNum + weekIndex * 2) % options.length
    return { ...options[idx] }
}

/**
 * Seleciona exercícios de preparação do movimento por pilar
 * (Preparação é neutra — não tem filtro de nível)
 */
export function getPreparationExercises(
    pillar: Pillar,
    sessionIndex: number
): PreparationExercise[] {
    const options = PREP_MAP[pillar]
    const idx = sessionIndex % options.length
    return options[idx].map(ex => ({ ...ex }))
}

/**
 * Gera o protocolo final baseado no objetivo do aluno e fase da semana
 * Exercícios Juba: Condicionamento
 */
export function generateFinalProtocol(
    goal: string,
    weekPhase: string
): SessionPrescription['finalProtocol'] {
    if (goal === 'emagrecimento' || weekPhase === 'PEAK') {
        return {
            name: 'HIIT Metabólico',
            totalTime: '8 minutos',
            structure: '30s trabalho / 30s descanso × 8 rounds',
            exercises: [
                { name: 'Corda Naval', duration: '30s', rest: '30s' },
                { name: 'Climbers', duration: '30s', rest: '30s' },
                { name: 'Air Bike', duration: '30s', rest: '30s' },
                { name: 'Skipping', duration: '30s', rest: '30s' },
            ],
        }
    }
    if (goal === 'performance') {
        return {
            name: 'Potência Explosiva',
            totalTime: '6 minutos',
            structure: '20s máximo / 40s recuperação × 6 rounds',
            exercises: [
                { name: 'Air Bike', duration: '20s', rest: '40s' },
                { name: 'Skater com Salto', duration: '20s', rest: '40s' },
                { name: 'Corda Naval', duration: '20s', rest: '40s' },
            ],
        }
    }
    if (goal === 'recondicionamento' || weekPhase === 'ADAPTATION') {
        return {
            name: 'Circuito Regenerativo',
            totalTime: '6 minutos',
            structure: 'Movimentos suaves contínuos',
            exercises: [
                { name: 'Tração Esteira', duration: '2 min', rest: '-' },
                { name: 'Mobilidade Geral', duration: '2 min', rest: '-' },
                { name: 'Skipping', duration: '2 min', rest: '-' },
            ],
        }
    }
    if (goal === 'hipertrofia_funcional') {
        return {
            name: 'Drop Set Funcional',
            totalTime: '8 minutos',
            structure: '3 séries descendentes com pausa mínima',
            exercises: [
                { name: 'Corda Naval', duration: '60s', rest: '15s' },
                { name: 'Air Bike', duration: '60s', rest: '15s' },
                { name: 'Climbers', duration: '60s', rest: '15s' },
            ],
        }
    }
    // Default: Protocolo Metabólico Moderado
    return {
        name: 'Protocolo Metabólico Moderado',
        totalTime: '6 minutos',
        structure: '40s trabalho / 20s descanso × 6 rounds',
        exercises: [
            { name: 'Climbers', duration: '40s', rest: '20s' },
            { name: 'Skipping', duration: '40s', rest: '20s' },
            { name: 'Air Bike', duration: '40s', rest: '20s' },
        ],
    }
}

// ============================================================================
// PERIODIZAÇÃO — AJUSTES POR FASE
// ============================================================================

function applyPeriodization(exercise: ExercisePrescription, weekPhase: string, weekIndex?: number): ExercisePrescription {
    const adjusted = { ...exercise }

    // If exercise has weekly progression (Juba method), use it
    if (adjusted.weeklyReps && weekIndex !== undefined) {
        const weekIdx = Math.min(weekIndex, adjusted.weeklyReps.length - 1)
        adjusted.reps = adjusted.weeklyReps[weekIdx] || adjusted.reps
        if (adjusted.weeklyLoad) {
            const load = adjusted.weeklyLoad[weekIdx]
            if (load && load !== 'livre' && load !== 'progressiva') {
                adjusted.rest = `${adjusted.rest} | Carga: ${load}`
            }
        }
        return adjusted
    }

    // Fallback: use phase-based periodization for secondary/core exercises
    if (weekPhase === 'ADAPTATION') {
        adjusted.sets = Math.max(2, adjusted.sets - 1)
        adjusted.reps = adjustReps(adjusted.reps, 'up')
        adjusted.rest = adjustRest(adjusted.rest, 'up')
    } else if (weekPhase === 'PEAK') {
        adjusted.sets = Math.min(4, adjusted.sets + 1)
        adjusted.reps = adjustReps(adjusted.reps, 'down')
        adjusted.rest = adjustRest(adjusted.rest, 'down')
    }

    return adjusted
}

function adjustReps(reps: string, direction: 'up' | 'down'): string {
    const match = reps.match(/^(\d+)-(\d+)$/)
    if (match) {
        const low = parseInt(match[1])
        const high = parseInt(match[2])
        if (direction === 'up') {
            return `${low + 2}-${high + 2}`
        } else {
            return `${Math.max(4, low - 2)}-${Math.max(6, high - 2)}`
        }
    }
    const matchEach = reps.match(/^(\d+)\s+cada$/)
    if (matchEach) {
        const val = parseInt(matchEach[1])
        if (direction === 'up') return `${val + 2} cada`
        return `${Math.max(4, val - 2)} cada`
    }
    return reps
}

function adjustRest(rest: string, direction: 'up' | 'down'): string {
    const match = rest.match(/^(\d+)-(\d+)s$/)
    if (match) {
        const low = parseInt(match[1])
        const high = parseInt(match[2])
        if (direction === 'up') {
            return `${low + 15}-${high + 15}s`
        } else {
            return `${Math.max(15, low - 15)}-${Math.max(30, high - 15)}s`
        }
    }
    return rest
}

// ============================================================================
// GERADOR PRINCIPAL DE BLOCOS
// ============================================================================

/**
 * Gera os 3 blocos de treino para uma sessão, respeitando a regra:
 *   Ex1 = FOCO do pilar do dia (FILTRADO POR NÍVEL + LESÕES)
 *   Ex2 = SECUNDÁRIO de pilar OPOSITOR (FILTRADO POR NÍVEL + LESÕES)
 *   Ex3 = CORE (FILTRADO POR NÍVEL + LESÕES)
 *
 * Bloco 1 → Ex2 do opositor A (ex: PUSH quando dia=LOWER)
 * Bloco 2 → Ex2 do opositor B (ex: PULL quando dia=LOWER)
 * Bloco 3 → Ex2 alterna (baseado em sessão+semana para variação)
 */
export function generateBlocks(
    pillar: Pillar,
    weekIndex: number,
    sessionIndex: number,
    weekPhase: string = 'DEVELOPMENT',
    clientLevel: ExerciseLevel = 'BEGINNER',
    pain?: PainContext
): BlockPrescription[] {
    const blockKeys: Array<'bloco1' | 'bloco2' | 'bloco3'> = ['bloco1', 'bloco2', 'bloco3']
    const [opositorA, opositorB] = getOpposingPillars(pillar)

    // Rastrear nomes usados nesta sessão para deduplicação cross-bloco
    const usedNames = new Set<string>()

    return blockKeys.map((blockKey, idx) => {
        const blockNum = idx + 1

        // Ex1: FOCO — sempre do pilar do dia, com deduplicação entre blocos
        const foco = getFocoExercise(pillar, blockKey, sessionIndex, weekIndex, clientLevel, pain, usedNames)
        usedNames.add(foco.name)

        // Ex2: SECUNDÁRIO — de pilar opositor, FILTRADO POR NÍVEL + LESÕES
        let opposingPillar: Pillar
        if (blockNum === 1) {
            opposingPillar = opositorA
        } else if (blockNum === 2) {
            opposingPillar = opositorB
        } else {
            opposingPillar = (sessionIndex) % 2 === 0 ? opositorA : opositorB
        }
        const secundario = getSecundarioExercise(pillar, opposingPillar, sessionIndex, weekIndex, blockNum, clientLevel, pain)
        usedNames.add(secundario.name)

        // Ex3: CORE — neutro, FILTRADO POR NÍVEL + LESÕES
        const core = getCoreExercise(blockKey, sessionIndex, weekIndex, blockNum, clientLevel, pain)
        usedNames.add(core.name)

        // Aplicar periodização (com weekIndex para progressão semanal Juba)
        const focoAdjusted = applyPeriodization(foco, weekPhase, weekIndex)
        const secundarioAdjusted = applyPeriodization(secundario, weekPhase)
        const coreAdjusted = applyPeriodization(core, weekPhase)

        const blockDescriptions: Record<number, string> = {
            1: `Foco ${pillar} + ${opposingPillar} + Core Estável`,
            2: `Foco ${pillar} + ${opposingPillar} + Core Anti-Rotação`,
            3: `Foco ${pillar} + ${opposingPillar} + Core Desafiador`,
        }

        return {
            blockIndex: blockNum,
            name: `Bloco ${blockNum}`,
            description: blockDescriptions[blockNum] || 'Integração',
            restAfterBlock: blockNum === 1 ? '90-120s' : blockNum === 2 ? '120-150s' : '60-90s',
            exercises: [focoAdjusted, secundarioAdjusted, coreAdjusted],
        }
    })
}
