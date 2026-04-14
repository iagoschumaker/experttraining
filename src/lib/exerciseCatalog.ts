// ============================================================================
// EXPERT PRO TRAINING — CATÁLOGO DE EXERCÍCIOS POR POSIÇÃO NO BLOCO
// ============================================================================
// Posição 0 (1º): Exercício Principal / Padrão Motor
// Posição 1 (2º): Exercício Complementar / Acessório
// Posição 2 (3º): Core / Estabilização / Rigidez
// ============================================================================

export interface ExerciseCatalogEntry {
  name: string
  pillar: 'PERNA' | 'EMPURRA' | 'PUXA' | 'ALL'
  position: 0 | 1 | 2 // position in block
  tip?: string
}

// ============ POSIÇÃO 0 — Padrão Motor Principal ============
const POSITION_0: ExerciseCatalogEntry[] = [
  // PERNA
  { name: 'Agachamento Box (Apoio Calcanhar ou Livre)', pillar: 'PERNA', position: 0 },
  { name: 'Agachamento Livre', pillar: 'PERNA', position: 0 },
  { name: 'Agachamento Búlgaro', pillar: 'PERNA', position: 0 },
  { name: 'Afundo (TRX/Livre/2Step/1Step)', pillar: 'PERNA', position: 0 },
  { name: 'Afundo KB', pillar: 'PERNA', position: 0 },
  { name: 'Subida Box Livre (Box Pequeno ou Médio)', pillar: 'PERNA', position: 0 },
  { name: 'Retrocesso Alternado', pillar: 'PERNA', position: 0 },
  { name: 'Leg Press', pillar: 'PERNA', position: 0 },
  { name: 'Stiff D.B', pillar: 'PERNA', position: 0 },
  { name: 'Hip Hinge KB', pillar: 'PERNA', position: 0 },
  { name: 'RDL Unil. D.B', pillar: 'PERNA', position: 0 },
  { name: 'Agachamento Goblet KB', pillar: 'PERNA', position: 0 },

  // EMPURRA
  { name: 'Desenvolvimento D.B (3 Apoios)', pillar: 'EMPURRA', position: 0 },
  { name: 'Supino Reto D.B', pillar: 'EMPURRA', position: 0 },
  { name: 'Supino Incl. D.B', pillar: 'EMPURRA', position: 0 },
  { name: 'Flexão de Braço', pillar: 'EMPURRA', position: 0 },
  { name: 'Flexão de Braço TRX', pillar: 'EMPURRA', position: 0 },
  { name: 'Press Ombro D.B', pillar: 'EMPURRA', position: 0 },
  { name: 'Press Arnold D.B', pillar: 'EMPURRA', position: 0 },
  { name: 'Supino Máquina', pillar: 'EMPURRA', position: 0 },
  { name: 'Crucifixo D.B', pillar: 'EMPURRA', position: 0 },

  // PUXA
  { name: 'Remada Unil. C.B (3 Apoios)', pillar: 'PUXA', position: 0 },
  { name: 'Pulley Teto Fechado C.B (3 Apoios)', pillar: 'PUXA', position: 0 },
  { name: 'Remada Curvada K.B (Adaptado Banco)', pillar: 'PUXA', position: 0 },
  { name: 'TRX Inclinado', pillar: 'PUXA', position: 0 },
  { name: 'Puxada Frente Máquina', pillar: 'PUXA', position: 0 },
  { name: 'Remada Baixa Máquina', pillar: 'PUXA', position: 0 },
  { name: 'Remada Cavalinho', pillar: 'PUXA', position: 0 },
  { name: 'Barra Fixa', pillar: 'PUXA', position: 0 },
]

// ============ POSIÇÃO 1 — Complementar / Acessório ============
const POSITION_1: ExerciseCatalogEntry[] = [
  // Universal
  { name: 'TRX', pillar: 'ALL', position: 1, tip: 'Regulagem por inclinação corporal' },
  { name: 'Carry K.B', pillar: 'ALL', position: 1 },
  { name: 'Meio Arremesso D.B', pillar: 'ALL', position: 1 },
  { name: 'Lombar Elas.', pillar: 'ALL', position: 1 },
  { name: 'Rigidez Elas. Cima/Baixo (3 Apoios)', pillar: 'ALL', position: 1 },
  { name: 'Urso ISO', pillar: 'ALL', position: 1 },
  { name: 'Flexão de Braço', pillar: 'ALL', position: 1 },
  { name: 'Press Elas.', pillar: 'ALL', position: 1 },
  { name: 'Elev. Lateral D.B', pillar: 'ALL', position: 1 },
  { name: 'Rotação Elas.', pillar: 'ALL', position: 1 },
  { name: 'Extensão Quadril 3 Apoios', pillar: 'ALL', position: 1 },
  { name: 'Hip Thrust Unil.', pillar: 'ALL', position: 1 },
  { name: 'Cadeira Extensora', pillar: 'ALL', position: 1 },
  { name: 'Mesa Flexora', pillar: 'ALL', position: 1 },
  { name: 'Adução Máquina', pillar: 'ALL', position: 1 },
  { name: 'Mini Band Tornozelo — Passo Lateral', pillar: 'ALL', position: 1 },
  { name: 'Rosca D.B Alternada', pillar: 'ALL', position: 1 },
  { name: 'Extensão Tríceps Elas.', pillar: 'ALL', position: 1 },
  { name: 'Face Pull Elas.', pillar: 'ALL', position: 1 },
]

// ============ POSIÇÃO 2 — Core / Estabilização ============
const POSITION_2: ExerciseCatalogEntry[] = [
  { name: 'Prancha Reta ISO (Bloco Perna ou Livre)', pillar: 'ALL', position: 2 },
  { name: 'Prancha Lateral (3 Apoios)', pillar: 'ALL', position: 2 },
  { name: 'Prancha Lateral', pillar: 'ALL', position: 2 },
  { name: 'Prancha com Toque de Ombro', pillar: 'ALL', position: 2 },
  { name: 'Ab Infra c/ Elástico', pillar: 'ALL', position: 2 },
  { name: 'Curl Up', pillar: 'ALL', position: 2 },
  { name: 'Dead Bug', pillar: 'ALL', position: 2 },
  { name: 'Pássaro-Cão (Bird Dog)', pillar: 'ALL', position: 2 },
  { name: 'Lombar Elas.', pillar: 'ALL', position: 2 },
  { name: 'Rigidez Elas. Cima/Baixo (3 Apoios)', pillar: 'ALL', position: 2 },
  { name: 'Urso ISO', pillar: 'ALL', position: 2 },
  { name: 'Rotação Pallof Elas.', pillar: 'ALL', position: 2 },
  { name: 'Hollow Hold', pillar: 'ALL', position: 2 },
  { name: 'Superman ISO', pillar: 'ALL', position: 2 },
  { name: 'Extensão Lombar Banco', pillar: 'ALL', position: 2 },
  { name: 'Crunch Abdominal', pillar: 'ALL', position: 2 },
  { name: 'Abdominal c/ Roda', pillar: 'ALL', position: 2 },
]

// ============ PREPARAÇÃO — Exercícios de Aquecimento ============
export const PREP_EXERCISES = [
  'Mobilidade: 90/90 2 Pontos',
  'Flexibilidade Posterior (Band Pé)',
  'Flexão Quadril 3 Apoios',
  'Ativação: Mini Band Tornozelo',
  'Extensão e Abdução',
  'Siri Lateral + Frontal',
  'Mobilidade: Anjo Parede',
  'Gato',
  'Torácica (3 Apoios)',
  'Ativação: Manguito Int./Ext. Elas.',
  'Press Elas.',
  'Mobilidade: Semi Ajoelhado c/ Rotação Braços',
  'Ativação: Protocolo Elas./Super Band',
  'Manguito 90/90 Ext.',
  'Mobilidade de Quadril',
  'Mobilidade Geral',
  'Ativação de Core',
  'Reach Lateral',
  'Reach Front',
  'Ativação Neuromuscular',
  'Agachamento com Halteres',
  'Rotação de Quadril',
  'Abertura de Quadril',
  'Mobilidade de Tornozelo',
  'Aquecimento Cardiovascular',
]

// ============ PROTOCOLO FINAL — Opções ============
export const FINAL_PROTOCOL_OPTIONS = [
  'Super Glut Mini Band 3x10 reps',
  'AMRAP 6 min: Burpee + Kettlebell Swing + Agachamento',
  'Circuito Cardio: 3 rounds — Pulo Corda 30s + Agachamento 15 reps',
  'Finalizador Glúteo: 3x15 Hip Thrust + 3x15 Extensão Quadril',
  'Alongamento Ativo 8 min — Cadeias Posterior e Anterior',
  'Protocolo Anti-Inflamatório: Alongamento 10 min',
  'Core Finalizador: 3x Prancha 30s + 3x10 Dead Bug',
  'Mobilidade Final: 5 min Cadeia Posterior',
  '',
]

export const ALL_EXERCISES = [...POSITION_0, ...POSITION_1, ...POSITION_2]

/**
 * Returns exercises appropriate for the given block position.
 * position 0 → motor pattern, position 1 → complementary, position 2 → core
 * pillar filters to treino type (PERNA, EMPURRA, PUXA)
 */
export function getExercisesForPosition(
  position: 0 | 1 | 2,
  pillar: string
): ExerciseCatalogEntry[] {
  return ALL_EXERCISES.filter(
    e => e.position === position && (e.pillar === 'ALL' || e.pillar === pillar)
  )
}

export const POSITION_LABELS: Record<number, { label: string; icon: string; color: string }> = {
  0: { label: 'Principal (Padrão Motor)', icon: '🎯', color: 'text-amber-400' },
  1: { label: 'Complementar / Acessório', icon: '🔄', color: 'text-blue-400' },
  2: { label: 'Core / Estabilização', icon: '⚡', color: 'text-purple-400' },
}
