// ============================================================================
// MÉTODO EXPERT TRAINING — BANCO DE EXERCÍCIOS POR PILAR
// ============================================================================
// MÉTODO JUBA — Exercícios reais das planilhas do Expert Training
//
// REGRA: Cada bloco tem 3 exercícios:
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

export type ExerciseSlot = 'FOCO_PRINCIPAL' | 'SECUNDARIO' | 'CORE'

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
// Estes são SEMPRE o Ex1 do bloco — devem ser do PILAR DO DIA
// Exercícios da planilha Juba por nível progressivo

const FOCO_LOWER: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // LOWER - Padrão SQUAT (iniciante → avançado)
        { name: 'Agachamento Goblet KB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Box', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Box Unilateral', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Salto DB', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Leg Press', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // LOWER - Padrão HINGE / UNILATERAL
        { name: 'Terra KB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Hexa Bar', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Stiff Unilateral KB', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Subida Box', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Subida Box 2KB', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // LOWER - Padrão LUNGE / UNILATERAL
        { name: 'Afundo', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Lunge Regress', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Retrocesso Alternado', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Afundo Búlgaro', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Lunge Alternado', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Reverse Lunge Slide', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Afundo Pliométrico', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Lunge com Salto', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Salto Vertical DB', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
}

const FOCO_PUSH: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // PUSH - Horizontal (iniciante → avançado)
        { name: 'Flexão de Braço', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Flexão de Braço TRX', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Flexão de Braço BOSU', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Flexão de Braço Pé Box', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Flexão de Braço MB Alternada', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Flexão de Braço com Carga', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // PUSH - Vertical / Press (iniciante → avançado)
        { name: 'Push Press DB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push CB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Press DB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Press DB Unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Desenvolvimento DB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push Press Explosivo', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Desenvolvimento Alternado DB', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // PUSH - Integração / Combos (avançado)
        { name: 'Push + Pull', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push + Press', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push Unilateral + Press', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
}

const FOCO_PULL: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // PULL - TRX (iniciante → avançado)
        { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Inclinado', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Fly', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Pé Box', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Y', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Isométrico', sets: 3, reps: '20-30s', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Isométrico + Press', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco2: [ // PULL - Remada (intermediário → avançado)
        { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Alternada DB', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Corda', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Explosiva', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
    ],
    bloco3: [ // PULL - Carry / Integração
        { name: 'Carry', sets: 3, reps: '30-40m', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
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
            { name: 'Flexão de Braço', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Flexão de Braço TRX', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Push Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Desenvolvimento DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
        ],
        PULL: [
            { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'TRX Inclinado', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Remada Alternada DB', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'TRX Y', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
        ],
    },
    // Dia PUSH → secundários vêm de LOWER ou PULL
    PUSH: {
        LOWER: [
            { name: 'Agachamento Goblet KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Agachamento Box', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Afundo', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Terra KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Subida Box', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Retrocesso Alternado', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
        ],
        PUSH: [], // nunca usado
        PULL: [
            { name: 'TRX Remada', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'TRX Inclinado', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Remada Curvada DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Remada Corda', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Carry', sets: 3, reps: '30-40m', rest: '40-60s', role: 'SECUNDARIO' },
        ],
    },
    // Dia PULL → secundários vêm de LOWER ou PUSH
    PULL: {
        LOWER: [
            { name: 'Agachamento Goblet KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Terra KB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Afundo Búlgaro', sets: 3, reps: '8 cada', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Subida Box', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Agachamento Box', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Lunge Alternado', sets: 3, reps: '10 cada', rest: '40-60s', role: 'SECUNDARIO' },
        ],
        PUSH: [
            { name: 'Flexão de Braço', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Push Press DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Desenvolvimento DB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Flexão de Braço TRX', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
            { name: 'Push CB', sets: 3, reps: '10-12', rest: '40-60s', role: 'SECUNDARIO' },
        ],
        PULL: [], // nunca usado
    },
}

// ============================================================================
// EXERCÍCIOS DE CORE — POR BLOCO
// ============================================================================
// Core é neutro, serve qualquer pilar
// Exercícios Juba: Core / Estabilidade

const CORE: Record<'bloco1' | 'bloco2' | 'bloco3', ExercisePrescription[]> = {
    bloco1: [ // Core estável - iniciante
        { name: 'Prancha Alta', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Lateral', sets: 3, reps: '20-30s cada', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Alcance', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Rigidez Fit Ball', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
        { name: 'Rigidez Aqua Ball', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
        { name: 'Rigidez Elástico', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
    ],
    bloco2: [ // Core anti-rotação - intermediário
        { name: 'Prancha Alta com Alcance', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Dinâmica', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Toque Ombro', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Rigidez Fit Ball Vai/Volta', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE' },
        { name: 'Perdigueiro Inverso', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Pollof Press Elástico', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
    ],
    bloco3: [ // Core desafiador - avançado
        { name: 'Ab X-Up', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE' },
        { name: 'Ab X-Up DB', sets: 3, reps: '8-10', rest: '20-40s', role: 'CORE' },
        { name: 'Rigidez Elástico Passo Lateral', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Dinâmica', sets: 3, reps: '12-15', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha Alta com Alcance', sets: 3, reps: '12 cada', rest: '20-40s', role: 'CORE' },
    ],
}

// ============================================================================
// PREPARAÇÃO DO MOVIMENTO — POR PILAR
// ============================================================================
// Exercícios Juba: Mobilidade / Preparação

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
 * Seleciona exercício secundário de um pilar OPOSITOR ao pilar do dia
 */
export function getSecundarioExercise(
    dayPillar: Pillar,
    opposingPillar: Pillar,
    sessionIndex: number,
    weekIndex: number,
    blockNum: number
): ExercisePrescription {
    const options = SECUNDARIO[dayPillar][opposingPillar]
    if (options.length === 0) {
        // Fallback: nunca deveria acontecer se a lógica está correta
        throw new Error(`Pilar opositor ${opposingPillar} é igual ao pilar do dia ${dayPillar}`)
    }
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

interface PeriodizationAdjust {
    setsMultiplier: number
    repsLabel: string
    restLabel: string
}

function getPeriodizationAdjust(weekPhase: string): PeriodizationAdjust {
    switch (weekPhase) {
        case 'ADAPTATION':
            return { setsMultiplier: 0.85, repsLabel: 'alta (12-15)', restLabel: 'amplo' }
        case 'PEAK':
            return { setsMultiplier: 1.15, repsLabel: 'baixa (6-8)', restLabel: 'reduzido' }
        default: // DEVELOPMENT
            return { setsMultiplier: 1, repsLabel: 'média (8-12)', restLabel: 'padrão' }
    }
}

function applyPeriodization(exercise: ExercisePrescription, weekPhase: string): ExercisePrescription {
    const adjust = getPeriodizationAdjust(weekPhase)
    const adjusted = { ...exercise }

    // Ajustar séries por fase
    if (weekPhase === 'ADAPTATION') {
        adjusted.sets = Math.max(2, adjusted.sets - 1)
        // Aumentar reps na adaptação
        adjusted.reps = adjustReps(adjusted.reps, 'up')
        // Descanso mais longo
        adjusted.rest = adjustRest(adjusted.rest, 'up')
    } else if (weekPhase === 'PEAK') {
        adjusted.sets = Math.min(4, adjusted.sets + 1)
        // Diminuir reps no pico
        adjusted.reps = adjustReps(adjusted.reps, 'down')
        // Descanso mais curto
        adjusted.rest = adjustRest(adjusted.rest, 'down')
    }

    return adjusted
}

function adjustReps(reps: string, direction: 'up' | 'down'): string {
    // Para reps com formato "X-Y", ajustar
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
    // Para reps com "X cada"
    const matchEach = reps.match(/^(\d+)\s+cada$/)
    if (matchEach) {
        const val = parseInt(matchEach[1])
        if (direction === 'up') return `${val + 2} cada`
        return `${Math.max(4, val - 2)} cada`
    }
    // Para outros formatos (tempo, etc.), manter
    return reps
}

function adjustRest(rest: string, direction: 'up' | 'down'): string {
    // Para rests com formato "Xs-Ys"
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
 *   Ex1 = FOCO do pilar do dia
 *   Ex2 = SECUNDÁRIO de pilar OPOSITOR (alterna entre blocos)
 *   Ex3 = CORE (neutro)
 *
 * Bloco 1 → Ex2 do opositor A (ex: PUSH quando dia=LOWER)
 * Bloco 2 → Ex2 do opositor B (ex: PULL quando dia=LOWER)
 * Bloco 3 → Ex2 alterna (baseado em sessão+semana para variação)
 */
export function generateBlocks(
    pillar: Pillar,
    weekIndex: number,
    sessionIndex: number,
    weekPhase: string = 'DEVELOPMENT'
): BlockPrescription[] {
    const blockKeys: Array<'bloco1' | 'bloco2' | 'bloco3'> = ['bloco1', 'bloco2', 'bloco3']
    const [opositorA, opositorB] = getOpposingPillars(pillar)

    return blockKeys.map((blockKey, idx) => {
        const blockNum = idx + 1

        // Ex1: FOCO — sempre do pilar do dia
        const foco = getFocoExercise(pillar, blockKey, sessionIndex, weekIndex)

        // Ex2: SECUNDÁRIO — de pilar opositor, alternando por bloco
        let opposingPillar: Pillar
        if (blockNum === 1) {
            opposingPillar = opositorA
        } else if (blockNum === 2) {
            opposingPillar = opositorB
        } else {
            // Bloco 3: alterna baseado na semana+sessão para variação
            opposingPillar = (sessionIndex + weekIndex) % 2 === 0 ? opositorA : opositorB
        }
        const secundario = getSecundarioExercise(pillar, opposingPillar, sessionIndex, weekIndex, blockNum)

        // Ex3: CORE — neutro, diferentes por bloco
        const core = getCoreExercise(blockKey, sessionIndex, weekIndex, blockNum)

        // Aplicar periodização
        const focoAdjusted = applyPeriodization(foco, weekPhase)
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
