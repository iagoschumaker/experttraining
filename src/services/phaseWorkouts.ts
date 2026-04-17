// ============================================================================
// MÉTODO EXPERT TRAINING — CATÁLOGO COMPLETO DE TREINOS POR FASE
// ============================================================================
// Dados extraídos DIRETAMENTE das planilhas Excel do método.
// Cada fase/nível tem treinos FIXOS (Perna, Empurra, Puxa).
// Exercícios NUNCA MUDAM durante as 6 semanas — só reps/carga progridem.
//
// Chave: `${LEVEL}_${PHASE}` → 3 treinos (PERNA, EMPURRA, PUXA)
// ============================================================================

import { TrainingPhase, TrainingLevel } from './trainingPhases'

// ============================================================================
// TIPOS
// ============================================================================

export interface PhaseExercise {
  name: string
  reps: string
  /** Progressão semanal de reps (S1-S6) quando disponível */
  weeklyReps?: string[]
  /** Progressão semanal de carga (S1-S6) quando disponível */
  weeklyLoad?: string[]
}

export interface PhaseBlock {
  name: string
  exercises: PhaseExercise[]
}

export interface PhaseTreino {
  /** PERNA, EMPURRA, PUXA */
  pillar: 'PERNA' | 'EMPURRA' | 'PUXA'
  pillarLabel: string
  series: string
  blocos: PhaseBlock[]
  protocoloFinal: string
}

export interface PhasePreparation {
  title: string // "Preparação do Movimento I/II/III"
  exercises: { name: string; detail: string }[]
}

export interface PhaseWorkoutTemplate {
  level: TrainingLevel | 'CONDICIONAMENTO'
  phase: TrainingPhase
  phaseLabel: string
  treinos: PhaseTreino[]
  preparations: PhasePreparation[]
  /** Progressão macro: reps e carga por semana (S1-S6) */
  weeklyProgression?: {
    reps: string[]
    load: string[]
  }
}

// ============================================================================
// MAPA DE PREPARAÇÕES (compartilhadas por todas as fases)
// ============================================================================

const PREP_PERNA: PhasePreparation = {
  title: 'Preparação do Movimento I',
  exercises: [
    { name: 'Mobilidade: 90/90 2 Pontos', detail: '1x10 reps' },
    { name: 'Flexibilidade Posterior (Band Pé)', detail: '1x10 reps' },
    { name: 'Flexão Quadril 3 Apoios', detail: '1x10 reps' },
    { name: 'Ativação: Mini Band Tornozelo', detail: '' },
    { name: 'Extensão e Abdução', detail: '3x10 reps' },
    { name: 'Siri Lateral + Frontal', detail: '3x10 reps' },
  ],
}

const PREP_EMPURRA: PhasePreparation = {
  title: 'Preparação do Movimento II',
  exercises: [
    { name: 'Mobilidade: Anjo Parede', detail: '1x10 reps' },
    { name: 'Gato', detail: '1x10 reps' },
    { name: 'Torácica (3 Apoios)', detail: '1x10 reps' },
    { name: 'Ativação: Manguito Int./Ext. Elas.', detail: '2x15 reps' },
    { name: 'Press Elas.', detail: '2x15 reps' },
  ],
}

const PREP_PUXA: PhasePreparation = {
  title: 'Preparação do Movimento III',
  exercises: [
    { name: 'Mobilidade: Semi Ajoelhado c/ Rotação Braços', detail: '1x10 reps' },
    { name: 'Flexão Quadril 3 Apoios', detail: '1x10 reps' },
    { name: 'Ativação: Protocolo Elas./Super Band', detail: '2x20 reps' },
    { name: 'Manguito 90/90 Ext.', detail: '2x10 reps' },
  ],
}

const DEFAULT_PREPARATIONS: PhasePreparation[] = [PREP_PERNA, PREP_EMPURRA, PREP_PUXA]

// ============================================================================
// CATÁLOGO COMPLETO — INDEXADO POR CHAVE
// ============================================================================

export const PHASE_CATALOG: Record<string, PhaseWorkoutTemplate> = {}

// Função helper para registrar templates
function register(
  level: TrainingLevel | 'CONDICIONAMENTO',
  phase: TrainingPhase,
  phaseLabel: string,
  treinos: PhaseTreino[],
  preps?: PhasePreparation[],
  weeklyProgression?: { reps: string[]; load: string[] }
) {
  const key = `${level}_${phase}`
  PHASE_CATALOG[key] = {
    level,
    phase,
    phaseLabel,
    treinos,
    preparations: preps || DEFAULT_PREPARATIONS,
    weeklyProgression,
  }
}

// ============================================================================
// CONDICIONAMENTO — FUNDAMENTO HÍBRIDO I (THEME_SYSTEM aba 1)
// ============================================================================
register('CONDICIONAMENTO', 'CONDICIONAMENTO_1', 'Fundamento Híbrido I', [
  // TREINO 1: PERNA
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Agachamento Box (Apoio Calcanhar ou Livre)', reps: '' },
        { name: 'TRX', reps: '12 reps' },
        { name: 'Prancha Reta ISO (Bloco Perna ou Livre)', reps: '15-30\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Afundo (TRX/Livre/2Step/1Step)', reps: '' },
        { name: 'Carry K.B', reps: '30m' },
        { name: 'Prancha Lateral (3 Apoios)', reps: '15\'-20\' seg' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box Livre (Box Pequeno ou Médio)', reps: '' },
        { name: 'Meio Arremesso D.B', reps: '10 reps' },
        { name: 'Ab Infra c/ Elástico', reps: '15 reps' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  // TREINO 2: EMPURRA
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Desenvolvimento D.B (3 Apoios)', reps: '' },
        { name: 'Prancha Reta Bloco Perna', reps: '10\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Supino Reto D.B', reps: '' },
        { name: 'Lombar Elas.', reps: '10/10 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Supino Incl. D.B', reps: '' },
        { name: 'Rigidez Elas. Cima/Baixo (3 Apoios)', reps: '10/10 reps' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  // TREINO 3: PUXA
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B (3 Apoios)', reps: '' },
        { name: 'Urso ISO', reps: '20\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Teto Fechado C.B (3 Apoios)', reps: '' },
        { name: 'Prancha Lateral 3 Apoios', reps: '10\' seg' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Curvada K.B (Adaptado Banco)', reps: '' },
        { name: 'Curl Up', reps: '15\' seg' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// CONDICIONAMENTO — CONDICIONAMENTO HÍBRIDO (THEME_SYSTEM aba 2)
// ============================================================================
register('CONDICIONAMENTO', 'CONDICIONAMENTO_2', 'Condicionamento Híbrido', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Agachamento Box (Apoio Calcanhar ou Livre)', reps: '',
          weeklyReps: ['10', '10', '10', '8', '8', '8'],
          weeklyLoad: ['30%', '30%', '30%', '35%', '35%', '35%'] },
        { name: 'TRX', reps: '12 reps' },
        { name: 'Prancha Reta ISO (Bloco Perna ou Livre)', reps: '15-30\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Afundo (TRX/Livre/2Step/1Step)', reps: '' },
        { name: 'Flexão de Braço (B.B/Box/Step)', reps: '12 reps' },
        { name: 'Prancha Lateral (3 Apoios/3 Apoios Pé)', reps: '20\' seg' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box Livre (Box Pequeno ou Médio)', reps: '' },
        { name: 'Rigidez Elas. Cima/Baixo (3 Apoios ou Em Pé)', reps: '12/12 reps' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto D.B', reps: '' },
        { name: 'Reach (Assistência TRX)', reps: '12/12 reps' },
        { name: 'Pollof Press Elas. (3 Apoios ou Em Pé)', reps: '10/10 reps' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvolvimento D.B (3 Apoios) Unil.', reps: '' },
        { name: 'Puxada Elas.', reps: '12/12 reps' },
        { name: 'Lombar Elas.', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado D.B', reps: '' },
        { name: 'Rigidez Elas. +/-', reps: '15/15\' seg' },
      ]},
    ],
    protocoloFinal: 'Perdigueiro 3x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulley Teto C.B Fechado (3 Apoios)', reps: '' },
        { name: 'Press Uni Elas.', reps: '12/12 reps' },
        { name: 'Urso ISO', reps: '20\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Remada 3 Ponto K.B (Adapt. Banco/Livre)', reps: '' },
        { name: 'Afundo Lateral (Livre)', reps: '12 reps' },
        { name: 'Rigidez Elas. +/-', reps: '12/12 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Uni C.B (3 Apoios)', reps: '' },
        { name: 'Inferior Perna (Band Pé)', reps: '12/12 reps' },
      ]},
    ],
    protocoloFinal: 'Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// INICIANTE — HIPERTROFIA HÍBRIDA
// ============================================================================
register('INICIANTE', 'HIPERTROFIA', 'Hipertrofia Híbrida Iniciante', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Afundo K.B', reps: '',
          weeklyReps: ['12', '12', '10', '10', '8', '8'],
          weeklyLoad: ['60%', '60%', '70%', '70%', '80%', '80%'] },
        { name: 'TRX Remada', reps: '12 reps' },
        { name: 'Rigidez Elas.', reps: '15 reps' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Subida Box', reps: '' },
        { name: 'Flexão de Braço (Chão/M.B/Bosu)', reps: '12 reps' },
        { name: 'Lombar Elas.', reps: '10/10 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Agachamento Box', reps: '' },
        { name: 'Meio Arremesso D.B', reps: '10 reps' },
        { name: 'Prancha Lateral', reps: '20\' seg' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto D.B', reps: '' },
        { name: 'Puxada Elas. Alternado', reps: '12 reps' },
        { name: 'Prancha Reta (3 Apoios)', reps: '15-20\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvolvimento 2D.B Alt (3 Apoios)', reps: '' },
        { name: 'Agachamento Goblet K.B', reps: '12 reps' },
        { name: 'Rigidez Elas. Cima/Baixo', reps: '10/10 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado D.B', reps: '' },
        { name: 'Carry K.B', reps: '30m' },
        { name: 'Ab Infra c/ Elas.', reps: '15 reps' },
      ]},
    ],
    protocoloFinal: 'Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'TRX Remada', reps: '' },
        { name: 'Press K.B Unil.', reps: '10/10 reps' },
        { name: 'Prancha Lateral', reps: '20\' seg' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Puxada Elas. Alternado', reps: '' },
        { name: 'Afundo Alternado', reps: '12 reps' },
        { name: 'Lombar Elas.', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Curvada K.B', reps: '' },
        { name: 'Push Press D.B', reps: '12 reps' },
        { name: 'Rigidez Fit Ball', reps: '15 reps' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// INICIANTE — FORÇA HÍBRIDA
// ============================================================================
register('INICIANTE', 'FORCA', 'Força Híbrida Iniciante', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro K.B', reps: '',
          weeklyReps: ['10', '10', '8', '8', '8', '8'],
          weeklyLoad: ['75%', '75%', '80%', '80%', '85%', '85%'] },
        { name: 'Remada Alta D.B Alter.', reps: '20' },
        { name: 'Rigidez Elas. Cima/Baixo (Bila./Assimétrico)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Leg Press Unil./Bil.', reps: '' },
        { name: 'Flexão de Braço (Chão/M.B/Bosu/Pé Box)', reps: '10/10' },
        { name: 'Prancha Alta c/ Alcance', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 1K.B/2K.B', reps: '' },
        { name: 'Chopp/Lift K.B/C.B (3 Apoios ou 2 Apoios)', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Swimmers Elas. ou Remada Corda C.B', reps: '15' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvol. Unil. D.B (3 Apoios)', reps: '' },
        { name: 'Avanço Passada Livre ou 2K.B', reps: '' },
        { name: 'Ab Berço M.B', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. C.B', reps: '' },
        { name: 'Retrocesso Altern. + Puxa 2Elas.', reps: '' },
        { name: 'Ab Infra c/ Elas.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B (Polia Baixa)', reps: '' },
        { name: 'Ponte Unil. (Banco) ou Avanço Alt. M.B', reps: '15' },
        { name: 'Prancha Dinâmica (Anilha)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente C.B Unil. 2 Apoios', reps: '' },
        { name: 'Press Elas. Altern.', reps: '15' },
        { name: 'Prancha Lateral c/ Rotação', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Triângulo Máq.', reps: '' },
        { name: 'Afundo Lateral Unil. + Desenv. D.B', reps: '12' },
        { name: 'Ab Remador', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// INICIANTE — POTÊNCIA HÍBRIDA
// ============================================================================
register('INICIANTE', 'POTENCIA', 'Potência Híbrida Iniciante', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro 2K.B', reps: '',
          weeklyReps: ['5+5', '5+5', '5+5', '5+5', '5+5', '5+5'],
          weeklyLoad: ['85%', '85%', '85%', '85%', '85%', '85%'] },
        { name: 'Afundo c/ Salto Altern. D.B ou M.B', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Rigidez Fit Ball Vai/Volta', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Leg Press Bil.', reps: '' },
        { name: 'Salto Vertical (Livre ou DB)', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Abs Canivete (Simultâneo ou Altern.)', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 1K.B/2K.B', reps: '' },
        { name: 'Reach Lateral 2D.B ou Skater c/Salto', reps: '10' },
        { name: 'Climbers Livre ou Slide', reps: '10' },
      ]},
    ],
    protocoloFinal: 'HIIT 20\'/10\'seg 4\'min Air Bike',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Chest Pass M.B Parede', reps: '5' },
        { name: 'Air Bike', reps: '10' },
        { name: 'Ab Infra c/ Elas.', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Press Uni. D.B (3 Apoios)', reps: '' },
        { name: 'Desenvol. Altern. D.B', reps: '5' },
        { name: 'Lateral Reach Alter. (Livre ou DB)', reps: '5' },
        { name: 'Ab X Up Altern.', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. D.B', reps: '' },
        { name: 'Press Alt. Elas.', reps: '5' },
        { name: 'Retrocesso Unil. + Puxada 2Elas.', reps: '5' },
        { name: 'Lombar Fit Ball ou Elas.', reps: '12' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulley Frente Invertido', reps: '' },
        { name: 'Arremesso MB', reps: '5' },
        { name: 'Avanço Alternado (Livre ou K.B)', reps: '20' },
        { name: 'Prancha Lateral c/ Rotação', reps: '10' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Remada Unil. C.B (3 Apoios/Assim.)', reps: '' },
        { name: 'Remada Expl. Elas.', reps: '10' },
        { name: 'Afundo + Desenvol. 2D.B', reps: '10' },
        { name: 'Ab Rolinho', reps: '12' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// INICIANTE — RESISTÊNCIA / FADIGA
// ============================================================================
register('INICIANTE', 'RESISTENCIA', 'Resistência Fadiga Iniciante', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro 2K.B', reps: '5+5', weeklyLoad: ['85%', '85%', '85%', '85%', '85%', '85%'] },
        { name: 'Afundo c/ Salto Altern. D.B ou M.B', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Rigidez Fit Ball Vai/Volta', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Leg Press Bil.', reps: '' },
        { name: 'Salto Vertical (Livre ou DB)', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Abs Canivete (Simultâneo ou Altern.)', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 1K.B/2K.B', reps: '' },
        { name: 'Reach Lateral 2D.B ou Skater c/Salto', reps: '10' },
        { name: 'Climbers Livre ou Slide', reps: '10' },
      ]},
    ],
    protocoloFinal: 'HIIT 20\'/10\'seg 4\'min Air Bike',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Chest Pass M.B Parede', reps: '5' },
        { name: 'Air Bike', reps: '10' },
        { name: 'Ab Infra c/ Elas.', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Press Uni. D.B (3 Apoios)', reps: '' },
        { name: 'Desenvol. Altern. D.B', reps: '5' },
        { name: 'Esteira', reps: '5' },
        { name: 'Lombar (Assim. ou Bila.)', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Unil. D.B', reps: '' },
        { name: 'Press Elas. Altern.', reps: '5' },
        { name: 'Meio Burpee (Box ou Step)', reps: '5' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Curvada B.B/C.B (Pronado)', reps: '' },
        { name: 'Swimmers', reps: '5' },
        { name: 'Skip Step Frente', reps: '5' },
        { name: 'Abs Remador', reps: '12' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Remada Triângulo Máq.', reps: '' },
        { name: 'Arremesso MB', reps: '5' },
        { name: 'Esteira', reps: '20' },
        { name: 'Prancha Alta c/ Alcance', reps: '10' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Pulldown C.B', reps: '' },
        { name: 'Remada Expl. Elas. Cima', reps: '10' },
        { name: 'Agachamento Wall Ball', reps: '10' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// INICIANTE — METABÓLICO
// ============================================================================
register('INICIANTE', 'METABOLICO', 'Metabólico Iniciante', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Agachamento KB', reps: '12' },
        { name: 'Aga. Salta M.B', reps: '12' },
        { name: 'TRX Inclinado', reps: '12' },
        { name: 'Climbers', reps: '30\'' },
        { name: 'Abs X-Up', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Afundo 2K.B', reps: '12' },
        { name: 'Afundo Pliométrico Alter. MB', reps: '20/20' },
        { name: 'Tração (Elas. ou Esteira)', reps: '20\'' },
        { name: 'Meio Arremesso DB', reps: '10' },
        { name: 'Prancha Dinâmica (Ombro)', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra/Puxa', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulley Frente Fechado', reps: '12' },
        { name: 'Arremesso M.B', reps: '12' },
        { name: 'Lunges Alter. (Livre ou D.B)', reps: '20' },
        { name: 'Rigidez Elas. +/-', reps: '15/15' },
        { name: 'Flexão de Braço (Chão ou Bosu)', reps: '10/10' },
        { name: 'Air Bike', reps: '30\'' },
        { name: 'Wall Ball', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Fly Incl. DB', reps: '12' },
        { name: 'Press Elas. Alter.', reps: '10/10' },
        { name: 'Bíceps TRX', reps: '12' },
        { name: 'Wall March', reps: '30\'' },
        { name: 'Ab Canivete Alter.', reps: '20' },
        { name: 'Agachamento + Puxada Elas.', reps: '15' },
        { name: 'Rigidez Fit Ball +/-', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Pilares/Cárdio', series: '3x',
    blocos: [
      { name: 'Bloco I (30\'/10\'seg)', exercises: [
        { name: 'Agachamento M.B ou Salto', reps: '' },
        { name: 'TRX Invertida', reps: '2\'min recup.' },
        { name: 'Flexão de Braço (M.B ou Pé Box)', reps: '' },
        { name: 'Corrida Esteira', reps: '' },
        { name: 'Ab Remador', reps: '' },
        { name: 'Agachamento + Desenvol. DB', reps: '' },
        { name: 'Corda Naval', reps: '' },
        { name: 'Lateral Reach (Livre ou DB)', reps: '' },
        { name: 'Prancha c/ Alcance', reps: '' },
        { name: 'Meio Burpee (Box ou Chopp Wood M.B)', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// INTERMEDIÁRIO — HIPERTROFIA HÍBRIDA
// ============================================================================
register('INTERMEDIARIO', 'HIPERTROFIA', 'Hipertrofia Híbrida Intermediário', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro K.B', reps: '',
          weeklyReps: ['12', '12', '10', '10', '8', '8'],
          weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'] },
        { name: 'TRX Inclinado Aberto', reps: '12 reps' },
        { name: 'Rigidez Elas. Ponta do Pé', reps: '15 reps' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Stiff Unil. K.B', reps: '' },
        { name: 'Flexão de Braço (Chão/M.B/Bosu/Pé Box)', reps: '12 reps' },
        { name: 'Prancha Toque Ombro', reps: '10/10' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Leg Press Unil./Bil.', reps: '' },
        { name: 'Push/Pull Elas. + DB', reps: '10/10' },
        { name: 'Prancha Dinâmica', reps: '' },
      ]},
    ],
    protocoloFinal: 'Leg Cranks M.B 2x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Swimmers Elas. ou Remada Corda C.B', reps: '15' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvol. Unil. D.B (3 Apoios)', reps: '' },
        { name: 'Avanço Passada Livre ou 2K.B', reps: '' },
        { name: 'Ab Berço M.B', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. C.B', reps: '' },
        { name: 'Retrocesso Altern. + Puxa 2Elas.', reps: '' },
        { name: 'Ab Infra c/ Elas.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Matrix D.B Empurra 2-3x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B (Polia Baixa)', reps: '' },
        { name: 'Ponte Unil. (Banco) ou Avanço Alt. M.B', reps: '15' },
        { name: 'Prancha Dinâmica (Anilha)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente C.B Unil. 2 Apoios', reps: '' },
        { name: 'Press Elas. Altern.', reps: '15' },
        { name: 'Prancha Lateral c/ Rotação', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Triângulo Máq.', reps: '' },
        { name: 'Afundo Lateral Unil. + Desenv. D.B', reps: '12' },
        { name: 'Ab Remador', reps: '' },
      ]},
    ],
    protocoloFinal: 'Meta Back 2-3x10 reps',
  },
])

// ============================================================================
// INTERMEDIÁRIO — FORÇA HÍBRIDA
// ============================================================================
register('INTERMEDIARIO', 'FORCA', 'Força Híbrida Intermediário', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro 2K.B', reps: '',
          weeklyReps: ['5+5', '5+5', '5+5', '5+5', '5+5', '5+5'],
          weeklyLoad: ['85%', '85%', '85%', '85%', '85%', '85%'] },
        { name: 'Remada Alta D.B Alter.', reps: '20' },
        { name: 'Rigidez Elas. Cima/Baixo (Bila./Assimétrico)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Leg Press Unil./Bil.', reps: '' },
        { name: 'Flexão de Braço (Chão/M.B/Bosu/Pé Box)', reps: '10/10' },
        { name: 'Prancha Alta c/ Alcance', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 1K.B/2K.B', reps: '' },
        { name: 'Chopp/Lift K.B/C.B (3 Apoios ou 2 Apoios)', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Swimmers Elas. ou Remada Corda C.B', reps: '15' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvol. Unil. D.B (3 Apoios)', reps: '' },
        { name: 'Avanço Passada Livre ou 2K.B', reps: '' },
        { name: 'Ab Berço M.B', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. C.B', reps: '' },
        { name: 'Retrocesso Altern. + Puxa 2Elas.', reps: '' },
        { name: 'Ab Infra c/ Elas.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B (Polia Baixa)', reps: '' },
        { name: 'Ponte Unil. (Banco) ou Avanço Alt. M.B', reps: '15' },
        { name: 'Prancha Dinâmica (Anilha)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente C.B Unil. 2 Apoios', reps: '' },
        { name: 'Press Elas. Altern.', reps: '15' },
        { name: 'Prancha Lateral c/ Rotação', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Triângulo Máq.', reps: '' },
        { name: 'Afundo Lateral Unil. + Desenv. D.B', reps: '12' },
        { name: 'Ab Remador', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// INTERMEDIÁRIO — RESISTÊNCIA / FADIGA
// ============================================================================
register('INTERMEDIARIO', 'RESISTENCIA', 'Resistência Fadiga Intermediário', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Búlgaro 2K.B', reps: '5+5', weeklyLoad: ['85%', '85%', '85%', '85%', '85%', '85%'] },
        { name: 'Afundo c/ Salto Altern. D.B ou M.B', reps: '5' },
        { name: 'Wall March', reps: '30\' seg' },
        { name: 'Rigidez Fit Ball Vai/Volta', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Leg Press Bil.', reps: '' },
        { name: 'Salto Vertical (Livre ou DB)', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Abs Canivete (Simultâneo ou Altern.)', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 1K.B/2K.B', reps: '' },
        { name: 'Reach Lateral 2D.B ou Skater c/Salto', reps: '10' },
        { name: 'Climbers Livre ou Slide', reps: '10' },
      ]},
    ],
    protocoloFinal: 'HIIT 20\'/10\'seg 4\'min Air Bike',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Chest Pass M.B Parede', reps: '5' },
        { name: 'Air Bike', reps: '10' },
        { name: 'Ab Infra c/ Elas.', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Press Uni. D.B (3 Apoios)', reps: '' },
        { name: 'Desenvol. Altern. D.B', reps: '5' },
        { name: 'Esteira', reps: '5' },
        { name: 'Lombar (Assim. ou Bila.)', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Unil. D.B', reps: '' },
        { name: 'Press Elas. Altern.', reps: '5' },
        { name: 'Meio Burpee (Box ou Step)', reps: '5' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Curvada B.B/C.B (Pronado)', reps: '' },
        { name: 'Swimmers', reps: '5' },
        { name: 'Skip Step Frente', reps: '5' },
        { name: 'Abs Remador', reps: '12' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Remada Triângulo Máq.', reps: '' },
        { name: 'Arremesso MB', reps: '5' },
        { name: 'Esteira', reps: '20' },
        { name: 'Prancha Alta c/ Alcance', reps: '10' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Pulldown C.B', reps: '' },
        { name: 'Remada Expl. Elas. Cima', reps: '10' },
        { name: 'Agachamento Wall Ball', reps: '10' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// INTERMEDIÁRIO — METABÓLICO
// ============================================================================
register('INTERMEDIARIO', 'METABOLICO', 'Metabólico Intermediário', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Agachamento KB', reps: '12' },
        { name: 'Aga. Salta D.B', reps: '12' },
        { name: 'TRX Inclinado ou Fly', reps: '12' },
        { name: 'Climbers (Livre ou Slide)', reps: '30\'' },
        { name: 'Abs X-Up D.B', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Búlgaro 2K.B', reps: '12' },
        { name: 'Afundo Pliométrico Alter. M.B', reps: '20/20' },
        { name: 'Tração Esteira', reps: '20\'' },
        { name: 'Meio Arremesso DB', reps: '10' },
        { name: 'Prancha Dinâmica Anilha', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra/Puxa', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulldown Barrinha C.B', reps: '12' },
        { name: 'Arremesso M.B', reps: '12' },
        { name: 'Avanço Alter. (K.B ou D.B)', reps: '20' },
        { name: 'Rigidez Fit Ball +/-', reps: '15/15' },
        { name: 'Flexão de Braço (Bosu)', reps: '10/10' },
        { name: 'Air Bike', reps: '30\'' },
        { name: 'Wall Ball', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Fly Incl. DB', reps: '12' },
        { name: 'Flexão M.B Alter. ou Press Elas.', reps: '10/10' },
        { name: 'Bíceps TRX ou Invertido', reps: '12' },
        { name: 'Wall March', reps: '30\'' },
        { name: 'Ab Canivete Alter.', reps: '20' },
        { name: 'Retrocesso + Puxada Elas.', reps: '15' },
        { name: 'Prancha Alta c/ Alcance', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Pilares/Cárdio', series: '3x',
    blocos: [
      { name: 'Bloco I (30\'/10\'seg)', exercises: [
        { name: 'Agachamento Salto M.B ou D.B', reps: '' },
        { name: 'Remada Curvada Alter. D.B', reps: '2\'min recup.' },
        { name: 'Flexão de Braço Diamante/Press Alter.', reps: '' },
        { name: 'Corrida Esteira', reps: '' },
        { name: 'Ab Remador', reps: '' },
        { name: 'Afundo Lateral + Desenvol. DB', reps: '' },
        { name: 'Corda Naval', reps: '' },
        { name: 'Lateral Reach D.B', reps: '' },
        { name: 'Prancha Reta c/ Alcance', reps: '' },
        { name: 'Meio Burpee c/ M.B ou Livre', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// AVANÇADO — HIPERTROFIA HÍBRIDA I
// ============================================================================
register('AVANCADO', 'HIPERTROFIA', 'Hipertrofia Híbrida Avançada I', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Afundo Búlgaro (1K.B ou 2K.B)', reps: '',
          weeklyReps: ['12', '12', '10', '10', '8', '8'],
          weeklyLoad: ['70%', '70%', '75%', '75%', '85%', '85%'] },
        { name: 'TRX Pé Box ou Remada Corda C.B', reps: '12' },
        { name: 'Prancha c/ Remada D.B ou Toque Ombro', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Stiff Unil. 1K.B C.L ou 2K.B', reps: '' },
        { name: 'Flexão de Braço (Pé Box/TRX Inclinado)', reps: '10/10' },
        { name: 'Rigidez Fit Ball Vai/Volta', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Agachamento Goblet + Extensora', reps: '' },
        { name: 'Push C.B Unil. + Press D.B Unil.', reps: '10/10' },
        { name: 'Prancha Alta c/ Alcance', reps: '' },
      ]},
    ],
    protocoloFinal: 'Leg Cranks M.B 2x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Inclinado D.B (Progressivo)', reps: '' },
        { name: 'Remada Curvada Alternado Assim. ou Bil.', reps: '12' },
        { name: 'Lombar Fit Ball ou Ponte Unil. M.B', reps: '10/10' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Crucifixo Reto D.B (Rest Pause 10\')', reps: '+ falha' },
        { name: 'Lunge Regress 1K.B C.L/2K.B', reps: '10/10' },
        { name: 'Rotação Twistter M.B/Prancha Reta Slide', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Desenvol. D.B Alternado (Banco) + Flexão de Braços', reps: '' },
        { name: 'Ab Infra SB ou Elas.', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Meta Chest 1.0',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Afundo Alt. (Livre ou 2K.B)', reps: '12' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Press D.B Unil. ou Elas. Altern.', reps: '12/12' },
        { name: 'Prancha Dinâmica ou Toque Ombro', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'TRX Pé Box ou Remada Curvada D.B Alt.', reps: '' },
        { name: 'Retrocesso Unil. + Puxa C.B Unil.', reps: '' },
        { name: 'Ab Infra Alt. ou Fit Ball (Quadril)', reps: '' },
      ]},
    ],
    protocoloFinal: 'Triple Threat Fit Ball 3x10 reps',
  },
])

// ============================================================================
// AVANÇADO — FORÇA HÍBRIDA I
// ============================================================================
register('AVANCADO', 'FORCA', 'Força Híbrida Avançada I', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Afundo Búlgaro (1K.B C.L ou 2K.B)', reps: '',
          weeklyReps: ['5+5', '5+5', '5+5', '5+5', '5+5', '5+5'],
          weeklyLoad: ['85%', '85%', '85%', '85%', '85%', '85%'] },
        { name: 'TRX (Pé Box ou Inclin. Pronado)', reps: '12' },
        { name: 'Prancha Alta c/ Alcance', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Hexa Bar/Stiff Unil. 1K.B C.L ou 2K.B', reps: '' },
        { name: 'Flexão de Braços TRX', reps: '10/10' },
        { name: 'Rigidez Aqua Ball', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Leg Press Unil./Bil.', reps: '' },
        { name: 'Push C.B Unil. + Press D.B Unil.', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Inclin. D.B (Unil./Alternado)', reps: '' },
        { name: 'Remada Unil. C.B Assim.', reps: '15' },
        { name: 'Ponte Unil./Alternado (Apoio Banco)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvol. Unil. D.B (Assim./3 Apoios)', reps: '' },
        { name: 'Rigidez TRX', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. C.B', reps: '' },
        { name: 'Retrocesso + Puxa C.B Unil.', reps: '' },
        { name: 'Ab Infra Alt. ou Fit Ball (Quadril)', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Afundo Alt. (Livre ou 2K.B)', reps: '12' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Press D.B Unil. ou Elas. Altern.', reps: '12/12' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'TRX Pé Box ou Remada Curvada D.B Alt.', reps: '' },
        { name: 'Retrocesso Unil. + Puxa C.B Unil.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// AVANÇADO — RESISTÊNCIA I
// ============================================================================
register('AVANCADO', 'RESISTENCIA', 'Resistência Fadiga Avançada I', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Subida Box 2K.B ou Stiff Unil. 2K.B', reps: '' },
        { name: 'Reach Lateral 2D.B ou Skater c/Salto', reps: '5' },
        { name: 'Skipping', reps: '10' },
        { name: 'Rigidez Aqua Ball', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Agachamento Box K.B (Unil. ou Bila.)', reps: '' },
        { name: 'Salto Vertical DB', reps: '5' },
        { name: 'Corda Naval (Simul.)', reps: '10' },
        { name: 'Rigidez Fit Ball +/-', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Lunge Regress Unil. (1K.B ou 2K.B)', reps: '' },
        { name: 'Tração Esteira', reps: '10' },
        { name: 'Ab X-Up', reps: '10' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto B.B/D.B', reps: '' },
        { name: 'Chest Pass M.B ou Flexão (3\'exce. p/1\'com..)', reps: '5' },
        { name: 'Esteira', reps: '10' },
        { name: 'Rigidez Elas. Cima/Baixo', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Press Alt. 2D.B (3 Apoios ou Assim.)', reps: '' },
        { name: 'Desenvol. Altern. D.B (Assim.)', reps: '5' },
        { name: 'Corda Naval Alt.', reps: '5' },
        { name: 'Ab Infra S.B', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Unil. C.B', reps: '' },
        { name: 'Flexão de Braço M.B Alt. ou Press Elas. Alter.', reps: '5' },
        { name: 'Climbers Livre ou Slide', reps: '5' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Curvada B.B/C.B (Pronado)', reps: '' },
        { name: 'Swimmers', reps: '5' },
        { name: 'Lunges Lateral Alternado K.B', reps: '10' },
        { name: 'Ab Twistter Aqua Ball', reps: '12' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Arremesso M.B', reps: '5' },
        { name: 'Agachamento Goblet', reps: '20' },
        { name: 'Ab X Up', reps: '10' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Remada Expl. Elas. Cima', reps: '10' },
        { name: 'Agachamento Wall Ball', reps: '10' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// AVANÇADO — METABÓLICO I
// ============================================================================
register('AVANCADO', 'METABOLICO', 'Metabólico Avançado I', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Retrocesso Alt. (Goblet/2KB)', reps: '12' },
        { name: 'Tração Esteira', reps: '12' },
        { name: 'TRX (Pé no Box ou Fly)', reps: '12' },
        { name: 'Climbers (Livre ou Slide)', reps: '30\'' },
        { name: 'Abs X-Up D.B', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Búlgaro (1K.B/2K.B)', reps: '12' },
        { name: 'Lunges Alter. c/Salto (D.B/M.B)', reps: '30\'' },
        { name: 'Meio Arremesso DB', reps: '20\'' },
        { name: 'Air Bike', reps: '10' },
        { name: 'Prancha Alta c/ Remada D.B', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Super Legs',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra/Puxa', series: '4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulley Frente Fechado', reps: '12' },
        { name: 'Arremesso M.B', reps: '12' },
        { name: 'Avanço Alter. (K.B ou D.B)', reps: '20' },
        { name: 'Rigidez Fit Ball +/-', reps: '15/15' },
        { name: 'Flexão de Braço (Bosu)', reps: '10/10' },
        { name: 'Air Bike', reps: '30\'' },
        { name: 'Wall Ball', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Supino Reto (D.B ou B.B)', reps: '12' },
        { name: 'Chest Pass M.B', reps: '10/10' },
        { name: 'Bíceps TRX ou Invertido', reps: '12' },
        { name: 'Wall March', reps: '30\'' },
        { name: 'Ab Infra Fit Ball (Quadril)', reps: '20' },
        { name: 'Retrocesso Alt. + Puxada Elas.', reps: '15' },
        { name: 'Prancha Alta Anilha', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Pilares/Cárdio', series: '3x',
    blocos: [
      { name: 'Bloco I (30\'/10\'seg)', exercises: [
        { name: 'Agachamento Salto D.B', reps: '' },
        { name: 'TRX Pé Box', reps: '2\'min recup.' },
        { name: 'Flexão de Braço Pé Box', reps: '' },
        { name: 'Corrida Esteira', reps: '' },
        { name: 'Ab Remador', reps: '' },
        { name: 'Agachamento + Desenvol. DB', reps: '' },
        { name: 'Corda Naval', reps: '' },
        { name: 'Lateral Reach D.B', reps: '' },
        { name: 'Prancha c/ Alcance', reps: '' },
        { name: 'Meio Burpee c/ M.B ou Livre', reps: '' },
      ]},
    ],
    protocoloFinal: 'Super Legs + Meta Chest 2.0 + Meta Back',
  },
])

// ============================================================================
// AVANÇADO — HIPERTROFIA II
// ============================================================================
register('AVANCADO', 'HIPERTROFIA_2', 'Hipertrofia Híbrida Avançada II', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Lunges Alternado (Goblet/1K.B ou 2K.B)', reps: '' },
        { name: 'TRX Pé Box ou Remada Corda C.B', reps: '12' },
        { name: 'Prancha c/ Remada D.B ou Toque Ombro', reps: '15' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Hexa Bar ou Stiff Assim. 1K.B C.L/2K.B', reps: '' },
        { name: 'Flexão de Braço (Pé Box/TRX Inclinado)', reps: '12' },
        { name: 'Rigidez Aqua Ball', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Extensora + Agachamento Goblet', reps: '' },
        { name: 'Push Unil. D.B + Press Unil. C.B', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Protocolo Mini Band Coxa Abdução',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Inclinado D.B (Progressivo)', reps: '' },
        { name: 'Remada Curvada Alternado Assim. ou Bil.', reps: '12' },
        { name: 'Lombar Fit Ball ou Ponte Unil. M.B', reps: '10/10' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Crucifixo Reto D.B (Rest Pause 10\')', reps: '+ falha' },
        { name: 'Lunge Regress 1K.B C.L/2K.B', reps: '10/10' },
        { name: 'Rotação Twistter M.B/Prancha Reta Slide', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Desenvol. D.B Alternado (Banco) + Flexão de Braços', reps: '' },
        { name: 'Ab Infra SB ou Elas.', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Meta Chest 1.0',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Afundo Alt. (Livre ou 2K.B)', reps: '12' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Press D.B Unil. ou Elas. Altern.', reps: '12/12' },
        { name: 'Prancha Dinâmica ou Toque Ombro', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'TRX Pé Box ou Remada Curvada D.B Alt.', reps: '' },
        { name: 'Retrocesso Unil. + Puxa C.B Unil.', reps: '' },
        { name: 'Ab Infra Alt. ou Fit Ball (Quadril)', reps: '' },
      ]},
    ],
    protocoloFinal: 'Triple Threat Fit Ball 3x10 reps',
  },
])

// ============================================================================
// AVANÇADO — FORÇA II
// ============================================================================
register('AVANCADO', 'FORCA_2', 'Força Híbrida Avançada II', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Reverse Lunge Slide (1K.B ou 2K.B)', reps: '' },
        { name: 'TRX (Pé Box ou Inclin. Pronado)', reps: '20' },
        { name: 'Prancha Alta c/ Alcance', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Hexa Bar/Stiff Unil. 1K.B C.L ou 2K.B', reps: '' },
        { name: 'Flexão de Braços TRX', reps: '10/10' },
        { name: 'Rigidez Aqua Ball', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Leg Press Unil./Bil.', reps: '' },
        { name: 'Push C.B Unil. + Press D.B Unil.', reps: '10/10' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Inclin. D.B (Unil./Alternado)', reps: '' },
        { name: 'Remada Unil. C.B Assim.', reps: '15' },
        { name: 'Ponte Unil./Alternado (Apoio Banco)', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Desenvol. Unil. D.B (Assim./3 Apoios)', reps: '' },
        { name: 'Rigidez TRX', reps: '' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Fly Inclinado Unil. C.B', reps: '' },
        { name: 'Lunge Regress Unil. + Puxa C.B Unil.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Leg Cranks M.B 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Afundo Alt. (Livre ou 2K.B)', reps: '12' },
        { name: 'Lombar Fit Ball', reps: '' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Press D.B Unil. ou Elas. Altern.', reps: '12/12' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'TRX Pé Box ou Remada Curvada D.B Alt.', reps: '' },
        { name: 'Retrocesso Unil. + Puxa C.B Unil.', reps: '' },
      ]},
    ],
    protocoloFinal: 'Protocolo Dorsais: Bi-Trocantério Banco 3x10 reps',
  },
])

// ============================================================================
// AVANÇADO — RESISTÊNCIA II
// ============================================================================
register('AVANCADO', 'RESISTENCIA_2', 'Resistência Fadiga Avançada II', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Lunges Regress Alternado 2K.B', reps: '' },
        { name: 'Reach Lateral 2D.B ou Lunges Lateral c/Salto', reps: '5' },
        { name: 'TRX Y', reps: '10' },
        { name: 'Rigidez Aqua Ball', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Hexa Bar ou Terra K.B', reps: '' },
        { name: 'Salto Vertical DB', reps: '5' },
        { name: 'Flexão de Braços M.B Altern. ou Unil.', reps: '10' },
        { name: 'Rigidez Fit Ball +/-', reps: '15' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Búlgaro 1K.B C.L ou 2K.B', reps: '' },
        { name: 'Tração Esteira', reps: '10' },
        { name: 'Climbers Slide', reps: '10' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Supino Reto D.B Alternado/Simulta.', reps: '' },
        { name: 'Flexão de Braços M.B Altern. ou Unil.', reps: '5' },
        { name: 'Lunges Lateral Alternado K.B', reps: '10' },
        { name: 'Rigidez Elas. Cima/Baixo', reps: '20' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Press Alt. 2D.B (3 Apoios ou Assim.)', reps: '' },
        { name: 'Desenvol. Altern. D.B (Assim.)', reps: '5' },
        { name: 'Remada Alta D.B Alternado', reps: '5' },
        { name: 'Ab Infra c/ Elas.', reps: '15 reps' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Cross Over Incl.', reps: '' },
        { name: 'Press Elas. Alter.', reps: '5' },
        { name: 'Arremesso M.B Parede Rotação', reps: '5' },
      ]},
    ],
    protocoloFinal: 'HIIT 30\'/10\'seg 5\'min Esteira',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Remada Curvada B.B/C.B (Pronado)', reps: '' },
        { name: 'Swimmers', reps: '5' },
        { name: 'Press Alter. Elas. ou Flexão de Braços Bosu', reps: '5' },
        { name: 'Ab Twistter Aqua Ball', reps: '12' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Pulley Frente Triângulo ou Barra Fixa Elas.', reps: '' },
        { name: 'Arremesso M.B', reps: '5' },
        { name: 'Agachamento Goblet', reps: '20' },
        { name: 'Ab X Up', reps: '10' },
      ]},
      { name: 'Bloco III', exercises: [
        { name: 'Remada Unil. C.B Assim.', reps: '' },
        { name: 'Remada Expl. Elas. Cima', reps: '10' },
        { name: 'Agachamento Wall Ball', reps: '10' },
      ]},
    ],
    protocoloFinal: 'Protocolos 2-3x',
  },
])

// ============================================================================
// AVANÇADO — METABÓLICO II
// ============================================================================
register('AVANCADO', 'METABOLICO_2', 'Metabólico Avançado II', [
  {
    pillar: 'PERNA', pillarLabel: 'Treino 1: Perna', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Subida Box 2K.B/Agachamento Goblet Box', reps: '12' },
        { name: 'Tração Esteira', reps: '20\'' },
        { name: 'TRX (Fly)', reps: '12' },
        { name: 'Flexão de Braços Chão/M.B Alterna.', reps: '10/10' },
        { name: 'Arremesso M.B Parede Rotação', reps: '10/10' },
        { name: 'Ab X-Up', reps: '10' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Hexa Bar/Terra K.B/Sumô K.B', reps: '12' },
        { name: 'Air Bike', reps: '20\'' },
        { name: 'Desenv. Altern. D.B ou Flexão Bosu', reps: '10/10' },
        { name: 'Remada Curvada D.B Altern.', reps: '10/10' },
        { name: 'Arremesso Alto M.B', reps: '10' },
        { name: 'Rigidez Fit Ball Vai/Volta', reps: '20' },
      ]},
    ],
    protocoloFinal: 'Super Glut Mini Band 3x10 reps',
  },
  {
    pillar: 'EMPURRA', pillarLabel: 'Treino 2: Empurra/Puxa', series: '3-4x',
    blocos: [
      { name: 'Bloco I', exercises: [
        { name: 'Pulley Frente/Pulldown Barrinha', reps: '12' },
        { name: 'Swimmers Altern.', reps: '12' },
        { name: 'Press Elas. Alterna.', reps: '15/15' },
        { name: 'Corda Naval', reps: '10/10' },
        { name: 'Prancha Reta c/ Alcance', reps: '30\'' },
      ]},
      { name: 'Bloco II', exercises: [
        { name: 'Crucifixo Reto D.B', reps: '12' },
        { name: 'Press Elas./Flexão de Braços Pé Box', reps: '10/10' },
        { name: 'Bíceps TRX ou Pé Box', reps: '12' },
        { name: 'Retrocesso Alternado 2K.B', reps: '30\'' },
        { name: 'Wall March', reps: '20' },
        { name: 'Climbers Slide ou Livre', reps: '15' },
      ]},
    ],
    protocoloFinal: 'Protocolo Peito/Ombro: Meta Chest Elas. 2x10 reps',
  },
  {
    pillar: 'PUXA', pillarLabel: 'Treino 3: Pilares/Cárdio', series: '3-4x',
    blocos: [
      { name: 'Bloco I (30\'/10\'seg)', exercises: [
        { name: 'Agachamento Wall Ball', reps: '' },
        { name: 'Ab Remador', reps: '2\'min recup.' },
        { name: 'Lunges Altern. c/Rotação M.B/Aqua Ball', reps: '' },
        { name: 'Corrida Esteira', reps: '' },
        { name: 'Avanço Alter. + Desenvol. DB', reps: '' },
        { name: 'Air Bike', reps: '' },
        { name: 'Rigidez Fit Ball Circular', reps: '' },
        { name: 'Farmer Carrys D.B ou Arremesso M.B Parede', reps: '' },
      ]},
    ],
    protocoloFinal: 'Super Legs + Meta Chest 2.0 + Meta Back',
  },
])

// ============================================================================
// FUNÇÕES DE BUSCA
// ============================================================================

/**
 * Busca o template de treino para um nível + fase específicos.
 * Para CONDICIONAMENTO, usa level='CONDICIONAMENTO'.
 * Para os demais, usa o nível do aluno.
 */
export function getPhaseWorkout(
  level: TrainingLevel,
  phase: TrainingPhase
): PhaseWorkoutTemplate | null {
  // Condicionamento é compartilhado entre todos os níveis
  if (phase === 'CONDICIONAMENTO_1' || phase === 'CONDICIONAMENTO_2') {
    return PHASE_CATALOG[`CONDICIONAMENTO_${phase}`] || null
  }
  
  const key = `${level}_${phase}`
  return PHASE_CATALOG[key] || null
}

/**
 * Lista todas as fases disponíveis no catálogo para um nível.
 */
export function getAvailablePhasesForLevel(level: TrainingLevel): TrainingPhase[] {
  const phases: TrainingPhase[] = []
  for (const key of Object.keys(PHASE_CATALOG)) {
    if (key.startsWith(`${level}_`) || key.startsWith('CONDICIONAMENTO_')) {
      const template = PHASE_CATALOG[key]
      if (template && !phases.includes(template.phase)) {
        phases.push(template.phase)
      }
    }
  }
  return phases
}
