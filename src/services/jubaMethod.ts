// ============================================================================
// EXPERT TRAINING - MÉTODO EXPERT TRAINING (JUBA)
// ============================================================================
// Cálculos de composição corporal e metas baseados na proporção
// massa magra : gordura
//
// HOMEM: para cada 1kg gordura → 6kg massa magra (ratioTarget = 6)
// MULHER: para cada 1kg gordura → 4kg massa magra (ratioTarget = 4)
//
// O sistema NÃO calcula "peso ideal". O aluno escolhe meta e opcionalmente
// um peso meta. A cada avaliação calculamos a composição e projeções.
// ============================================================================

import { z } from 'zod'

// ============================================================================
// TYPES
// ============================================================================

export type Sex = 'M' | 'F'

export interface BodyComposition {
  fatKg: number
  leanKg: number
}

export interface JubaComputed {
  weight: number
  bodyFatPercent: number
  fatKg: number
  leanKg: number
  ratioCurrent: number | null // leanKg / fatKg (null se fatKg == 0)
  ratioTarget: number          // 6 (homem) ou 4 (mulher)
  idealLeanKg: number          // fatKg * ratioTarget
  leanToGainKg: number         // max(0, idealLeanKg - leanKg)
  monthsEstimate: MonthsEstimate
  sex: Sex
}

export interface MonthsEstimate {
  minMonths: number
  maxMonths: number
  avgMonths: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RATIO_TARGET: Record<Sex, number> = {
  M: 6,
  F: 4,
}

// Ganho médio de massa magra por mês (kg)
const LEAN_GAIN_PER_MONTH: Record<Sex, { min: number; max: number; avg: number }> = {
  M: { min: 0.5, max: 1.0, avg: 0.7 },
  F: { min: 0.3, max: 0.6, avg: 0.45 },
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const jubaInputSchema = z.object({
  weight: z.number().positive('Peso deve ser positivo'),
  bodyFatPercent: z.number().min(1).max(70, '% gordura inválido'),
  sex: z.enum(['M', 'F']),
})

// ============================================================================
// CÁLCULOS
// ============================================================================

/**
 * Calcula massa gorda e massa magra a partir do peso e % gordura
 */
export function calculateBodyComposition(weight: number, bodyFatPercent: number): BodyComposition {
  const fatKg = round(weight * (bodyFatPercent / 100))
  const leanKg = round(weight - fatKg)
  return { fatKg, leanKg }
}

/**
 * Retorna o ratio alvo baseado no sexo
 */
export function getRatioTarget(sex: Sex): number {
  return RATIO_TARGET[sex]
}

/**
 * Estima meses necessários para ganhar leanToGainKg de massa magra
 */
export function estimateMonths(leanToGainKg: number, sex: Sex): MonthsEstimate {
  if (leanToGainKg <= 0) {
    return { minMonths: 0, maxMonths: 0, avgMonths: 0 }
  }

  const rates = LEAN_GAIN_PER_MONTH[sex]

  // Com taxa máxima = menor tempo; com taxa mínima = maior tempo
  const minMonths = Math.max(6, Math.ceil(leanToGainKg / rates.max))
  const maxMonths = Math.max(12, Math.ceil(leanToGainKg / rates.min))
  const avgMonths = Math.max(6, Math.ceil(leanToGainKg / rates.avg))

  return { minMonths, maxMonths, avgMonths }
}

/**
 * Cálculo completo do Método Juba
 */
export function calculateJubaMethod(input: {
  weight: number
  bodyFatPercent: number
  sex: Sex
}): JubaComputed {
  const { weight, bodyFatPercent, sex } = input

  const { fatKg, leanKg } = calculateBodyComposition(weight, bodyFatPercent)
  const ratioTarget = getRatioTarget(sex)

  const ratioCurrent = fatKg > 0 ? round(leanKg / fatKg) : null
  const idealLeanKg = round(fatKg * ratioTarget)
  const leanToGainKg = round(Math.max(0, idealLeanKg - leanKg))

  const monthsEstimate = estimateMonths(leanToGainKg, sex)

  return {
    weight,
    bodyFatPercent,
    fatKg,
    leanKg,
    ratioCurrent,
    ratioTarget,
    idealLeanKg,
    leanToGainKg,
    monthsEstimate,
    sex,
  }
}

/**
 * Tenta calcular computedJson a partir dos dados de uma avaliação.
 * Retorna null se dados insuficientes.
 */
export function computeFromAssessment(
  bodyMetrics: { weight?: number; bodyFat?: number; height?: number } | null | undefined,
  clientGender: string | null | undefined,
): JubaComputed | null {
  if (!bodyMetrics) return null

  const weight = bodyMetrics.weight
  const bodyFat = bodyMetrics.bodyFat
  const sex = normalizeSex(clientGender)

  if (!weight || !bodyFat || !sex) return null

  return calculateJubaMethod({ weight, bodyFatPercent: bodyFat, sex })
}

// ============================================================================
// HELPERS
// ============================================================================

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Normaliza o gênero do cliente para 'M' | 'F' | null
 */
export function normalizeSex(gender: string | null | undefined): Sex | null {
  if (!gender) return null
  const g = gender.toUpperCase().trim()
  if (g === 'M' || g === 'MALE' || g === 'MASCULINO') return 'M'
  if (g === 'F' || g === 'FEMALE' || g === 'FEMININO') return 'F'
  return null
}
