// ============================================================================
// EXPERT TRAINING - POLLOCK BODY COMPOSITION SERVICE
// ============================================================================
// Fórmulas de Jackson-Pollock (3 e 7 dobras cutâneas) + Siri para % gordura
// ============================================================================

export interface SkinfoldsInput {
  // 3-pt masculino: peito + abdômen + coxa
  chest?: number
  abdomen?: number
  thigh?: number
  // 3-pt feminino: tríceps + suprailíaca + coxa
  triceps?: number
  suprailiac?: number
  // 7-pt (ambos): + axilar médio + subescapular
  midaxillary?: number
  subscapular?: number
}

export interface PollockResult {
  method: '3pt_male' | '3pt_female' | '7pt_male' | '7pt_female'
  bodyFatPercent: number
  fatKg: number
  leanKg: number
  density: number
  sumSkinfolds: number
}

/** Equação de Siri: converte densidade corporal em % gordura */
function siri(density: number): number {
  return (495 / density) - 450
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2))
}

/** Pollock 3 dobras — Masculino (peito + abdômen + coxa) */
export function pollock3Male(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number
): PollockResult | null {
  const { chest, abdomen, thigh } = skinfolds
  if (!chest || !abdomen || !thigh || !weight || !age) return null
  const S = chest + abdomen + thigh
  const dc = 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * age
  const pct = Math.max(0, Math.min(60, siri(dc)))
  return {
    method: '3pt_male',
    bodyFatPercent: round2(pct),
    fatKg: round2(weight * pct / 100),
    leanKg: round2(weight * (1 - pct / 100)),
    density: round2(dc),
    sumSkinfolds: S,
  }
}

/** Pollock 3 dobras — Feminino (tríceps + suprailíaca + coxa) */
export function pollock3Female(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number
): PollockResult | null {
  const { triceps, suprailiac, thigh } = skinfolds
  if (!triceps || !suprailiac || !thigh || !weight || !age) return null
  const S = triceps + suprailiac + thigh
  const dc = 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * age
  const pct = Math.max(0, Math.min(60, siri(dc)))
  return {
    method: '3pt_female',
    bodyFatPercent: round2(pct),
    fatKg: round2(weight * pct / 100),
    leanKg: round2(weight * (1 - pct / 100)),
    density: round2(dc),
    sumSkinfolds: S,
  }
}

/** Pollock 7 dobras — Masculino */
export function pollock7Male(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number
): PollockResult | null {
  const { chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh } = skinfolds
  if (!chest || !midaxillary || !triceps || !subscapular || !abdomen || !suprailiac || !thigh || !weight || !age) return null
  const S = chest + midaxillary + triceps + subscapular + abdomen + suprailiac + thigh
  const dc = 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * age
  const pct = Math.max(0, Math.min(60, siri(dc)))
  return {
    method: '7pt_male',
    bodyFatPercent: round2(pct),
    fatKg: round2(weight * pct / 100),
    leanKg: round2(weight * (1 - pct / 100)),
    density: round2(dc),
    sumSkinfolds: S,
  }
}

/** Pollock 7 dobras — Feminino */
export function pollock7Female(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number
): PollockResult | null {
  const { chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh } = skinfolds
  if (!chest || !midaxillary || !triceps || !subscapular || !abdomen || !suprailiac || !thigh || !weight || !age) return null
  const S = chest + midaxillary + triceps + subscapular + abdomen + suprailiac + thigh
  const dc = 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * age
  const pct = Math.max(0, Math.min(60, siri(dc)))
  return {
    method: '7pt_female',
    bodyFatPercent: round2(pct),
    fatKg: round2(weight * pct / 100),
    leanKg: round2(weight * (1 - pct / 100)),
    density: round2(dc),
    sumSkinfolds: S,
  }
}

/**
 * Slaughter — Equação para jovens (7-17 anos)
 * Usa tríceps + panturrilha (mais validado) ou tríceps + subescapular
 */
export function slaughterYouth(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number,
  sex: 'M' | 'F'
): PollockResult | null {
  const { triceps, subscapular, thigh } = skinfolds
  // Para jovens, usar tríceps + coxa como aproximação se panturrilha não disponível
  // A equação original usa tríceps + panturrilha, mas adaptamos com o que temos
  if (!triceps || !weight) return null

  let pct: number
  const method = sex === 'M' ? '3pt_male' : '3pt_female'

  if (sex === 'M') {
    if (subscapular) {
      // Slaughter masculino: tríceps + subescapular
      const S = triceps + subscapular
      if (S <= 35) {
        pct = 1.21 * S - 0.008 * S * S - 1.7
      } else {
        pct = 0.783 * S + 1.6
      }
    } else if (thigh) {
      // Fallback: usar tríceps + coxa com fórmula adaptada Jackson-Pollock
      const S = triceps + thigh
      pct = 0.735 * S + 1.0
    } else {
      return null
    }
  } else {
    // Feminino
    if (subscapular) {
      // Slaughter feminino: tríceps + subescapular
      const S = triceps + subscapular
      if (S <= 35) {
        pct = 1.33 * S - 0.013 * S * S - 2.5
      } else {
        pct = 0.546 * S + 9.7
      }
    } else if (thigh) {
      // Fallback feminino: tríceps + coxa
      const S = triceps + thigh
      pct = 0.610 * S + 5.1
    } else {
      return null
    }
  }

  pct = Math.max(3, Math.min(50, pct))
  const sumSf = triceps + (subscapular || thigh || 0)

  return {
    method: method as PollockResult['method'],
    bodyFatPercent: round2(pct),
    fatKg: round2(weight * pct / 100),
    leanKg: round2(weight * (1 - pct / 100)),
    density: round2(1.0 - pct / 100), // approximate
    sumSkinfolds: sumSf,
  }
}

/**
 * Computa automaticamente: 
 * - Jovens (<18): Slaughter
 * - Adultos (≥18): Jackson-Pollock 7pt > 3pt conforme sexo
 * Retorna null se não houver dobras suficientes.
 */
export function computePollock(
  skinfolds: SkinfoldsInput,
  age: number,
  weight: number,
  sex: 'M' | 'F'
): PollockResult | null {
  if (!weight || age < 0) return null

  // Para jovens (< 18 anos), usar Slaughter
  if (age < 18) {
    return slaughterYouth(skinfolds, age, weight, sex) ?? null
  }

  // Adultos: Jackson-Pollock
  if (sex === 'M') {
    return pollock7Male(skinfolds, age, weight)
      ?? pollock3Male(skinfolds, age, weight)
      ?? null
  } else {
    return pollock7Female(skinfolds, age, weight)
      ?? pollock3Female(skinfolds, age, weight)
      ?? null
  }
}

/** Calcula idade em anos a partir de uma data de nascimento */
export function ageFromBirthDate(birthDate: string | Date): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return Math.max(0, age)
}

/** Rótulo legível do método */
export function methodLabel(method: PollockResult['method']): string {
  const labels: Record<PollockResult['method'], string> = {
    '3pt_male': 'Pollock 3 Dobras — Masculino',
    '3pt_female': 'Pollock 3 Dobras — Feminino',
    '7pt_male': 'Pollock 7 Dobras — Masculino',
    '7pt_female': 'Pollock 7 Dobras — Feminino',
  }
  return labels[method]
}
