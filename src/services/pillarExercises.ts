// ============================================================================
// MÉTODO EXPERT TRAINING — BANCO DE EXERCÍCIOS POR PILAR
// ============================================================================
// Exercícios organizados por Pilar (LOWER/PUSH/PULL) × Slot × Bloco
// Variação determinística via índices rotativos
// ============================================================================

import { Pillar } from './pillarRotation'

// ============================================================================
// TIPOS
// ============================================================================

export type ExerciseSlot = 'FOCO_PRINCIPAL' | 'PUSH_PULL_INTEGRADO' | 'CORE'

export interface ExercisePrescription {
    name: string
    sets: number
    reps: string
    rest: string
    role: ExerciseSlot
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
// EXERCÍCIOS DE FOCO PRINCIPAL — POR PILAR × BLOCO
// ============================================================================

const FOCO_LOWER: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // Padrão SQUAT
        { name: 'Agachamento Goblet', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Box Squat', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento com Pausa', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Frontal', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Sumô', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // Padrão HINGE
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Hip Hinge com Kettlebell', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Stiff Unilateral', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Good Morning', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Hip Thrust', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // Padrão LUNGE / UNILATERAL
        { name: 'Avanço Búlgaro', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Step-up com Elevação', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Avanço Reverso', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Pistol Assistido', sets: 3, reps: '6-8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Avanço Lateral', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
}

const FOCO_PUSH: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // PUSH horizontal
        { name: 'Supino com Halteres', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push-up com Controle', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Floor Press', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Supino Inclinado', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push-up com Pés Elevados', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // PUSH vertical
        { name: 'Desenvolvimento de Ombros', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Arnold Press', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push Press', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Elevação Lateral', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Desenvolvimento Unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // PUSH variação/integração
        { name: 'Dips (Paralela)', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Landmine Press', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Supino com Kettlebell', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Close Grip Push-up', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Thruster', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
}

const FOCO_PULL: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // PULL horizontal
        { name: 'Remada Curvada', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Invertida', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Cavalinho', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada com Cabo Sentado', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // PULL vertical
        { name: 'Puxada na Barra (ou Assistida)', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Pulldown Frontal', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Face Pull', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Pulldown Unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Chin-up (ou Assistido)', sets: 3, reps: '6-8', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // PULL integração
        { name: 'Remada com Rotação', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Alta', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Pull-apart com Banda', sets: 3, reps: '15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Kettlebell Row', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Row', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
}

// ============================================================================
// EXERCÍCIOS COMPLEMENTARES (PUSH+PULL INTEGRADO) — POR BLOCO
// ============================================================================

const COMPLEMENTAR: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [
        { name: 'Landmine Press Unilateral', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Push-up com Remada', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Thruster com Halteres', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Clean and Press', sets: 3, reps: '8-10', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Cable Push-Pull Alternado', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
    ],
    bloco2: [
        { name: 'Remada com Rotação', sets: 3, reps: '10 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Renegade Row', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Woodchop', sets: 3, reps: '10 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Single Arm Snatch', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Man Maker', sets: 3, reps: '6-8', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
    ],
    bloco3: [ // Bloco 3: exercício INTEGRADO push+pull obrigatório
        { name: 'Turkish Get-up', sets: 2, reps: '3 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Crawling com Push-up', sets: 3, reps: '8-10', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Kettlebell Windmill', sets: 3, reps: '6 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Farmers Walk', sets: 3, reps: '30m', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Suitcase Carry', sets: 3, reps: '30m cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
    ],
}

// ============================================================================
// EXERCÍCIOS DE CORE — POR BLOCO
// ============================================================================

const CORE: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // Core estável
        { name: 'Prancha Frontal', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
        { name: 'Dead Bug', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Lateral', sets: 3, reps: '20-30s cada', rest: '20-40s', role: 'CORE' },
        { name: 'Glute Bridge', sets: 3, reps: '12-15', rest: '20-40s', role: 'CORE' },
        { name: 'Hollow Hold', sets: 3, reps: '20-30s', rest: '20-40s', role: 'CORE' },
    ],
    bloco2: [ // Core anti-rotação
        { name: 'Pallof Press', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Bird Dog', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Anti-rotation Hold', sets: 3, reps: '20s cada', rest: '20-40s', role: 'CORE' },
        { name: 'Half Kneeling Chop', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Stir the Pot', sets: 3, reps: '8 cada', rest: '20-40s', role: 'CORE' },
    ],
    bloco3: [ // Core desafiador (obrigatório no bloco 3)
        { name: 'Ab Wheel Rollout', sets: 3, reps: '8-10', rest: '20-40s', role: 'CORE' },
        { name: 'Hollow Body Hold', sets: 3, reps: '20-30s', rest: '20-40s', role: 'CORE' },
        { name: 'Hanging Knee Raise', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE' },
        { name: 'L-Sit (ou progressão)', sets: 3, reps: '15-20s', rest: '20-40s', role: 'CORE' },
        { name: 'Mountain Climber Lento', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
    ],
}

// ============================================================================
// PREPARAÇÃO DO MOVIMENTO — POR PILAR
// ============================================================================

const PREPARACAO_LOWER: PreparationExercise[][] = [
    [
        { name: 'Círculos de Quadril', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: '90/90 Hip Stretch', sets: 2, reps: '30s cada lado', duration: '2 min' },
        { name: 'Glute Bridges', sets: 2, reps: '12', duration: '2 min' },
        { name: 'Monster Walk com Mini Band', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Agachamento sem Peso', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Marcha no Lugar', sets: 1, reps: '60s', duration: '2 min' },
    ],
    [
        { name: 'Mobilização de Tornozelo', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Alongamento de Piriforme', sets: 2, reps: '30s cada', duration: '2 min' },
        { name: 'Clamshell', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Prancha com Elevação de Perna', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Avanço com Rotação', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Polichinelos', sets: 1, reps: '30', duration: '2 min' },
    ],
    [
        { name: 'World Greatest Stretch', sets: 2, reps: '5 cada', duration: '2 min' },
        { name: 'Leg Swings Frontal', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Fire Hydrants', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Dead Bug (aquecimento)', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Inchworm', sets: 2, reps: '6', duration: '2 min' },
        { name: 'Skip Baixo', sets: 1, reps: '60s', duration: '2 min' },
    ],
]

const PREPARACAO_PUSH: PreparationExercise[][] = [
    [
        { name: 'Círculos de Ombro', sets: 2, reps: '10 cada direção', duration: '2 min' },
        { name: 'Rotação Torácica', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: 'Band Pull-apart', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Prancha com Toque no Ombro', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Push-up na Parede', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Arm Circles', sets: 1, reps: '30s cada', duration: '2 min' },
    ],
    [
        { name: 'Cat-Cow', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Thread the Needle', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Face Pull Leve', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Bird Dog', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Scapular Push-up', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Jumping Jacks', sets: 1, reps: '30', duration: '2 min' },
    ],
    [
        { name: 'Doorway Pec Stretch', sets: 2, reps: '30s cada', duration: '2 min' },
        { name: 'YTWL', sets: 2, reps: '8 cada letra', duration: '2 min' },
        { name: 'External Rotation com Banda', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Push-up Plus', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Bear Crawl', sets: 1, reps: '30s', duration: '2 min' },
    ],
]

const PREPARACAO_PULL: PreparationExercise[][] = [
    [
        { name: 'Rotação Torácica', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Cat-Cow', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Band Pull-apart', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Scapular Retraction', sets: 2, reps: '12', duration: '2 min' },
        { name: 'Flexão de Braço na Parede', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Arm Circles Dinâmicos', sets: 1, reps: '30s cada', duration: '2 min' },
    ],
    [
        { name: 'Thread the Needle', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Swimmer', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Face Pull com Elástico', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Bird Dog', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Prone Y Raise', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Jumping Jacks', sets: 1, reps: '30', duration: '2 min' },
    ],
    [
        { name: 'Foam Rolling Dorsal', sets: 1, reps: '60s', duration: '2 min' },
        { name: 'Rotação Torácica Quadrúpede', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'External Rotation', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Lat Stretch', sets: 2, reps: '30s cada', duration: '2 min' },
        { name: 'Skip Baixo', sets: 1, reps: '30s', duration: '2 min' },
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
 * Seleciona exercício de foco do pilar com variação determinística
 */
export function getFocoExercise(
    pillar: Pillar,
    blockKey: 'bloco1' | 'bloco2' | 'bloco3',
    sessionIndex: number,
    weekIndex: number
): ExercisePrescription {
    const options = FOCO_MAP[pillar][blockKey]
    const idx = (sessionIndex + weekIndex * 2) % options.length
    return { ...options[idx] }
}

/**
 * Seleciona exercício complementar (push+pull integrado) com variação
 */
export function getComplementarExercise(
    blockKey: 'bloco1' | 'bloco2' | 'bloco3',
    sessionIndex: number,
    weekIndex: number,
    blockNum: number
): ExercisePrescription {
    const options = COMPLEMENTAR[blockKey]
    const idx = (sessionIndex + blockNum + weekIndex) % options.length
    return { ...options[idx] }
}

/**
 * Seleciona exercício de core com variação
 */
export function getCoreExercise(
    blockKey: 'bloco1' | 'bloco2' | 'bloco3',
    sessionIndex: number,
    weekIndex: number,
    blockNum: number
): ExercisePrescription {
    const options = CORE[blockKey]
    const idx = (sessionIndex + blockNum + weekIndex * 2) % options.length
    return { ...options[idx] }
}

/**
 * Seleciona exercícios de preparação do movimento por pilar
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
                { name: 'Burpees ou variação', duration: '30s', rest: '30s' },
                { name: 'Mountain Climbers', duration: '30s', rest: '30s' },
                { name: 'Jump Squats', duration: '30s', rest: '30s' },
                { name: 'High Knees', duration: '30s', rest: '30s' },
            ],
        }
    }
    if (goal === 'performance') {
        return {
            name: 'Potência Explosiva',
            totalTime: '6 minutos',
            structure: '20s máximo / 40s recuperação × 6 rounds',
            exercises: [
                { name: 'Sprints curtos', duration: '20s', rest: '40s' },
                { name: 'Box Jump', duration: '20s', rest: '40s' },
                { name: 'Medicine Ball Slam', duration: '20s', rest: '40s' },
            ],
        }
    }
    if (goal === 'recondicionamento' || weekPhase === 'ADAPTATION') {
        return {
            name: 'Circuito Regenerativo',
            totalTime: '6 minutos',
            structure: 'Movimentos suaves contínuos',
            exercises: [
                { name: 'Caminhada leve', duration: '2 min', rest: '-' },
                { name: 'Alongamento dinâmico', duration: '2 min', rest: '-' },
                { name: 'Respiração diafragmática', duration: '2 min', rest: '-' },
            ],
        }
    }
    if (goal === 'hipertrofia_funcional') {
        return {
            name: 'Drop Set Funcional',
            totalTime: '8 minutos',
            structure: '3 séries descendentes com pausa mínima',
            exercises: [
                { name: 'Exercício composto pesado', duration: '60s', rest: '15s' },
                { name: 'Exercício composto médio', duration: '60s', rest: '15s' },
                { name: 'Exercício composto leve', duration: '60s', rest: '15s' },
            ],
        }
    }
    // Default: Protocolo Metabólico Moderado
    return {
        name: 'Protocolo Metabólico Moderado',
        totalTime: '6 minutos',
        structure: '40s trabalho / 20s descanso × 6 rounds',
        exercises: [
            { name: 'Polichinelos', duration: '40s', rest: '20s' },
            { name: 'Agachamento livre', duration: '40s', rest: '20s' },
            { name: 'Corrida estacionária', duration: '40s', rest: '20s' },
        ],
    }
}

/**
 * Gera os 3 blocos de treino para uma sessão, respeitando o pilar do dia
 */
export function generateBlocks(
    pillar: Pillar,
    weekIndex: number,
    sessionIndex: number
): BlockPrescription[] {
    const blockKeys: Array<'bloco1' | 'bloco2' | 'bloco3'> = ['bloco1', 'bloco2', 'bloco3']

    return blockKeys.map((blockKey, idx) => {
        const blockNum = idx + 1
        const foco = getFocoExercise(pillar, blockKey, sessionIndex, weekIndex)
        const complementar = getComplementarExercise(blockKey, sessionIndex, weekIndex, blockNum)
        const core = getCoreExercise(blockKey, sessionIndex, weekIndex, blockNum)

        return {
            blockIndex: blockNum,
            name: `Bloco ${blockNum}`,
            description: blockNum === 1 ? 'Introdução' : blockNum === 2 ? 'Desenvolvimento' : 'Integração',
            restAfterBlock: blockNum === 1 ? '90-120s' : blockNum === 2 ? '120-150s' : '60-90s',
            exercises: [foco, complementar, core],
        }
    })
}
