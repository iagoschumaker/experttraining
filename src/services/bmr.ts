// ============================================================================
// EXPERT TRAINING — BMR (Basal Metabolic Rate / Taxa Metabólica Basal)
// ============================================================================
// Fórmulas: Harris-Benedict, Mifflin-St Jeor, Katch-McArdle
// TDEE: multiplicadores de nível de atividade física
// ============================================================================

export interface BMRInput {
  weight: number     // kg
  height: number     // cm
  age: number        // anos
  gender: 'M' | 'F'
  leanMassKg?: number  // kg massa magra (para Katch-McArdle)
}

export interface BMRResult {
  method: 'harris' | 'mifflin' | 'katch' | 'inbody'
  methodLabel: string
  methodDescription: string
  kcal: number
  tdee: TDEEResult
  leanMassKg?: number
}

export interface TDEEResult {
  sedentary: number      // 1.2x — Sedentário (pouco ou nenhum exercício)
  light: number          // 1.375x — Leve (1-3x/semana)
  moderate: number       // 1.55x — Moderado (3-5x/semana)
  intense: number        // 1.725x — Intenso (6-7x/semana)
  veryIntense: number    // 1.9x — Muito intenso (atleta / 2x/dia)
}

export interface AllBMRResults {
  best: BMRResult           // Melhor método disponível
  harris?: BMRResult
  mifflin?: BMRResult
  katch?: BMRResult
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
  veryIntense: 1.9,
}

function calcTDEE(bmr: number): TDEEResult {
  return {
    sedentary: Math.round(bmr * ACTIVITY_MULTIPLIERS.sedentary),
    light: Math.round(bmr * ACTIVITY_MULTIPLIERS.light),
    moderate: Math.round(bmr * ACTIVITY_MULTIPLIERS.moderate),
    intense: Math.round(bmr * ACTIVITY_MULTIPLIERS.intense),
    veryIntense: Math.round(bmr * ACTIVITY_MULTIPLIERS.veryIntense),
  }
}

/**
 * Harris-Benedict revisada (Roza & Shizgal, 1984)
 * Masculino: TMB = 88.362 + (13.397 × peso) + (4.799 × altura) − (5.677 × idade)
 * Feminino:  TMB = 447.593 + (9.247 × peso) + (3.098 × altura) − (4.330 × idade)
 */
export function harrisBenedict(input: BMRInput): BMRResult | null {
  const { weight, height, age, gender } = input
  if (!weight || !height || !age || !gender) return null

  let kcal: number
  if (gender === 'M') {
    kcal = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
  } else {
    kcal = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age
  }

  kcal = Math.round(kcal)

  return {
    method: 'harris',
    methodLabel: 'Harris-Benedict',
    methodDescription: 'Fórmula clássica de 1984. Boa precisão geral para adultos.',
    kcal,
    tdee: calcTDEE(kcal),
  }
}

/**
 * Mifflin-St Jeor (1990) — Mais precisa para população atual
 * Masculino: TMB = (10 × peso) + (6.25 × altura) − (5 × idade) + 5
 * Feminino:  TMB = (10 × peso) + (6.25 × altura) − (5 × idade) − 161
 */
export function mifflinStJeor(input: BMRInput): BMRResult | null {
  const { weight, height, age, gender } = input
  if (!weight || !height || !age || !gender) return null

  let kcal: number
  if (gender === 'M') {
    kcal = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    kcal = 10 * weight + 6.25 * height - 5 * age - 161
  }

  kcal = Math.round(kcal)

  return {
    method: 'mifflin',
    methodLabel: 'Mifflin-St Jeor',
    methodDescription: 'Fórmula atual mais recomendada pela ciência moderna (1990).',
    kcal,
    tdee: calcTDEE(kcal),
  }
}

/**
 * Katch-McArdle — Usa massa magra (mais precisa quando disponível)
 * TMB = 370 + (21.6 × massa magra em kg)
 * Não depende de gênero — é calculado com base na massa magra
 */
export function katchMcArdle(leanMassKg: number): BMRResult | null {
  if (!leanMassKg || leanMassKg <= 0) return null

  const kcal = Math.round(370 + 21.6 * leanMassKg)

  return {
    method: 'katch',
    methodLabel: 'Katch-McArdle',
    methodDescription: 'Mais precisa — usa a massa magra real do aluno (Pollock ou InBody).',
    kcal,
    tdee: calcTDEE(kcal),
    leanMassKg,
  }
}

/**
 * Resultado direto do InBody (aparelho)
 */
export function fromInBody(bmrKcal: number): BMRResult {
  return {
    method: 'inbody',
    methodLabel: 'InBody H20 (aparelho)',
    methodDescription: 'Medido diretamente pela bioimpedância — dado mais preciso disponível.',
    kcal: Math.round(bmrKcal),
    tdee: calcTDEE(bmrKcal),
  }
}

/**
 * Calcula TODOS os BMRs disponíveis e retorna o melhor
 * Prioridade: InBody > Katch-McArdle > Mifflin-St Jeor > Harris-Benedict
 */
export function computeAllBMR(
  input: BMRInput,
  inBodyBMR?: number
): AllBMRResults | null {
  const { weight, height, age, gender } = input

  // Precisamos no mínimo de peso, altura, idade e gênero para qualquer cálculo
  if (!weight || !height || !age || !gender) return null

  const results: AllBMRResults = {} as AllBMRResults

  // InBody (prioridade máxima)
  if (inBodyBMR && inBodyBMR > 0) {
    results.best = fromInBody(inBodyBMR)
    results.harris = harrisBenedict(input) ?? undefined
    results.mifflin = mifflinStJeor(input) ?? undefined
    return results
  }

  // Katch-McArdle (usa massa magra — 2ª prioridade)
  if (input.leanMassKg && input.leanMassKg > 0) {
    results.katch = katchMcArdle(input.leanMassKg) ?? undefined
    results.best = results.katch!
  }

  // Harris e Mifflin sempre calculados (se tiver os dados básicos)
  results.harris = harrisBenedict(input) ?? undefined
  results.mifflin = mifflinStJeor(input) ?? undefined

  // Se não tem Katch, usa Mifflin como melhor
  if (!results.best && results.mifflin) {
    results.best = results.mifflin
  }

  // Fallback: Harris
  if (!results.best && results.harris) {
    results.best = results.harris
  }

  if (!results.best) return null

  return results
}

/** Classificação do TMB */
export function bmrCategory(kcal: number, gender: 'M' | 'F'): {
  label: string
  color: string
  description: string
} {
  if (gender === 'M') {
    if (kcal < 1400) return { label: 'Muito Baixo', color: 'text-red-400', description: 'Abaixo do esperado para adulto masculino' }
    if (kcal < 1700) return { label: 'Baixo', color: 'text-orange-400', description: 'Levemente abaixo da média' }
    if (kcal < 2100) return { label: 'Normal', color: 'text-emerald-400', description: 'Dentro da faixa esperada' }
    if (kcal < 2500) return { label: 'Alto', color: 'text-yellow-600', description: 'Metabolismo acelerado' }
    return { label: 'Muito Alto', color: 'text-purple-400', description: 'Metabolismo muito acelerado (atleta)' }
  } else {
    if (kcal < 1100) return { label: 'Muito Baixo', color: 'text-red-400', description: 'Abaixo do esperado para adulto feminino' }
    if (kcal < 1350) return { label: 'Baixo', color: 'text-orange-400', description: 'Levemente abaixo da média' }
    if (kcal < 1700) return { label: 'Normal', color: 'text-emerald-400', description: 'Dentro da faixa esperada' }
    if (kcal < 2000) return { label: 'Alto', color: 'text-yellow-600', description: 'Metabolismo acelerado' }
    return { label: 'Muito Alto', color: 'text-purple-400', description: 'Metabolismo muito acelerado' }
  }
}

export const ACTIVITY_LABELS = [
  { key: 'sedentary' as const, label: 'Sedentário', description: 'Pouco ou nenhum exercício', icon: '🪑', multiplier: 1.2 },
  { key: 'light' as const, label: 'Leve', description: '1-3x por semana', icon: '🚶', multiplier: 1.375 },
  { key: 'moderate' as const, label: 'Moderado', description: '3-5x por semana', icon: '🏃', multiplier: 1.55 },
  { key: 'intense' as const, label: 'Intenso', description: '6-7x por semana', icon: '💪', multiplier: 1.725 },
  { key: 'veryIntense' as const, label: 'Muito Intenso', description: 'Atleta / 2x ao dia', icon: '🏆', multiplier: 1.9 },
]
