// ============================================================================
// MÉTODO EXPERT TRAINING — TREINOS GESTANTE POR TRIMESTRE
// ============================================================================
// Protocolo gestante: sessões full-body adaptadas, sem rotação de pilares.
// FC máx 140bpm, temp < 38.5°C, 30-40 min por sessão.
// Exercícios focam em manutenção de tônus, NUNCA aumento de flexibilidade.
// Evitar movimentos balísticos ou grandes amplitudes articulares.
// ============================================================================

import { TrainingPhase } from './trainingPhases'

// ============================================================================
// TIPOS
// ============================================================================

export interface GestanteExercise {
  name: string
  reps: string
  notes?: string       // Instrução específica
  caution?: string     // Alerta de segurança
}

export interface GestanteBlock {
  name: string
  icon: string         // Emoji do bloco
  duration: string     // "10 min"
  exercises: GestanteExercise[]
}

export interface GestanteSession {
  title: string
  estimatedDuration: number  // minutos
  warmup: GestanteBlock
  blocks: GestanteBlock[]
  stretching: GestanteBlock
  relaxation: GestanteBlock
  safetyNotes: string[]
}

export interface GestantePhaseTemplate {
  phase: TrainingPhase
  phaseLabel: string
  trimester: number
  gestationalWeeksRange: string  // "1-12", "13-27", etc.
  sessionsPerWeek: number
  maxHeartRate: number
  maxTemp: number
  session: GestanteSession
}

// ============================================================================
// PREPARAÇÃO COMUM (adaptada por trimestre)
// ============================================================================

const WARMUP_BASE: GestanteBlock = {
  name: 'Aquecimento',
  icon: '🔥',
  duration: '5 min',
  exercises: [
    { name: 'Caminhada leve no lugar', reps: '2 min' },
    { name: 'Mobilidade articular suave (ombros, quadril, tornozelos)', reps: '1 min' },
    { name: 'Respiração diafragmática', reps: '10 ciclos' },
    { name: 'Ativação glúteos (ponte suave)', reps: '2x10' },
  ],
}

const STRETCHING_BASE: GestanteBlock = {
  name: 'Alongamento Suave',
  icon: '🧘',
  duration: '5 min',
  exercises: [
    { name: 'Alongamento posterior (sentada)', reps: '30s cada', notes: 'Sem insistência, manter posição' },
    { name: 'Alongamento quadríceps (em pé com apoio)', reps: '30s cada', caution: 'Evitar grande amplitude' },
    { name: 'Alongamento peitoral (na parede)', reps: '30s cada' },
    { name: 'Gato/Camelo suave', reps: '8 reps', notes: 'Foco na mobilidade, sem forçar' },
  ],
}

const RELAXATION_BASE: GestanteBlock = {
  name: 'Relaxamento',
  icon: '💆',
  duration: '3-5 min',
  exercises: [
    { name: 'Respiração 4-7-8 (inspira-segura-expira)', reps: '5 ciclos' },
    { name: 'Relaxamento progressivo muscular', reps: '2 min', notes: 'Deitada de lado esquerdo se necessário' },
    { name: 'Consciência corporal / mindfulness', reps: '1 min' },
  ],
}

// ============================================================================
// TEMPLATES POR TRIMESTRE
// ============================================================================

const GESTANTE_TEMPLATES: Record<string, GestantePhaseTemplate> = {
  // ------------------------------------------------------------------
  // 1º TRIMESTRE — Adaptação e Controle
  // ------------------------------------------------------------------
  GESTANTE_T1: {
    phase: 'GESTANTE_T1',
    phaseLabel: 'Gestante — 1º Trimestre',
    trimester: 1,
    gestationalWeeksRange: '1-12',
    sessionsPerWeek: 3,
    maxHeartRate: 140,
    maxTemp: 38.5,
    session: {
      title: 'Sessão Gestante T1',
      estimatedDuration: 35,
      warmup: WARMUP_BASE,
      blocks: [
        {
          name: 'Membros Inferiores',
          icon: '🦵',
          duration: '10 min',
          exercises: [
            { name: 'Agachamento livre (sentada→em pé)', reps: '3x12', notes: 'Amplitude confortável' },
            { name: 'Afundo estacionário com apoio', reps: '3x10 cada', notes: 'Usar cadeira ou parede para equilíbrio' },
            { name: 'Elevação de panturrilha', reps: '3x15', notes: 'Com apoio na parede' },
            { name: 'Ponte glútea', reps: '3x12', notes: 'Bilateral, sem peso' },
          ],
        },
        {
          name: 'Membros Superiores',
          icon: '💪',
          duration: '8 min',
          exercises: [
            { name: 'Remada com elástico', reps: '3x12', notes: 'Resistência leve a moderada' },
            { name: 'Press com elástico (em pé)', reps: '3x12', caution: 'Evitar Valsalva' },
            { name: 'Elevação lateral com halter leve', reps: '3x10', notes: 'Máx 2-3kg' },
          ],
        },
        {
          name: 'Core Adaptado',
          icon: '🎯',
          duration: '5 min',
          exercises: [
            { name: 'Ativação de assoalho pélvico (Kegel)', reps: '3x10', notes: 'Contrair 5s, relaxar 5s' },
            { name: 'Transverso abdominal (barriga para dentro)', reps: '3x10', notes: 'Inspirar e expirar ativando' },
            { name: 'Bird Dog (4 apoios)', reps: '2x8 cada', notes: 'Movimentos lentos e controlados' },
          ],
        },
      ],
      stretching: STRETCHING_BASE,
      relaxation: RELAXATION_BASE,
      safetyNotes: [
        '❤️ FC máxima: 140 bpm — use o teste da fala (conseguir conversar)',
        '🌡️ Temperatura corporal não deve ultrapassar 38.5°C',
        '⏱️ Duração: 30-40 minutos por sessão',
        '💧 Hidratação frequente durante todo o treino',
        '🚫 Evitar movimentos balísticos e grande amplitude articular',
        '⚠️ Parar imediatamente se sentir: tontura, dor, sangramento, falta de ar intensa',
      ],
    },
  },

  // ------------------------------------------------------------------
  // 2º TRIMESTRE — Manutenção e Equilíbrio
  // ------------------------------------------------------------------
  GESTANTE_T2: {
    phase: 'GESTANTE_T2',
    phaseLabel: 'Gestante — 2º Trimestre',
    trimester: 2,
    gestationalWeeksRange: '13-27',
    sessionsPerWeek: 3,
    maxHeartRate: 140,
    maxTemp: 38.5,
    session: {
      title: 'Sessão Gestante T2',
      estimatedDuration: 35,
      warmup: WARMUP_BASE,
      blocks: [
        {
          name: 'Membros Inferiores',
          icon: '🦵',
          duration: '10 min',
          exercises: [
            { name: 'Agachamento sumo (pés afastados)', reps: '3x10', notes: 'Acomodar a barriga entre as pernas' },
            { name: 'Subida no step baixo', reps: '3x10 cada', notes: 'Apoio disponível' },
            { name: 'Extensão de quadril (em pé, elástico)', reps: '3x12 cada' },
            { name: 'Abdução com mini band (sentada)', reps: '3x15' },
          ],
        },
        {
          name: 'Membros Superiores',
          icon: '💪',
          duration: '8 min',
          exercises: [
            { name: 'Remada sentada com elástico', reps: '3x12', notes: 'Postura ereta, sem comprimir abdômen' },
            { name: 'Press inclinado com halter leve', reps: '3x10', caution: 'Não deitar completamente de costas' },
            { name: 'Curl bíceps com halter', reps: '3x12', notes: 'Sentada ou em pé' },
          ],
        },
        {
          name: 'Core Adaptado + Equilíbrio',
          icon: '🎯',
          duration: '7 min',
          exercises: [
            { name: 'Kegel + Transverso combinado', reps: '3x10', notes: 'Contrair assoalho + barriga para dentro' },
            { name: 'Prancha modificada (joelhos)', reps: '3x15-20s', caution: 'Não ultrapassar 20s por vez' },
            { name: 'Equilíbrio unipodal (com apoio)', reps: '2x20s cada', notes: 'Apoiar na parede se necessário' },
            { name: 'Respiração intercostal', reps: '10 ciclos', notes: 'Expandir costelas lateralmente' },
          ],
        },
      ],
      stretching: {
        ...STRETCHING_BASE,
        exercises: [
          { name: 'Alongamento cadeia posterior (deitada de lado)', reps: '30s cada', caution: 'NÃO deitar de costas a partir deste trimestre' },
          { name: 'Abertura de quadril (borboleta sentada)', reps: '30s', notes: 'Sem pressionar os joelhos' },
          { name: 'Alongamento peitoral (portal)', reps: '30s cada' },
          { name: 'Gato/Camelo suave', reps: '8 reps' },
        ],
      },
      relaxation: RELAXATION_BASE,
      safetyNotes: [
        '❤️ FC máxima: 140 bpm — teste da fala',
        '🌡️ Temperatura < 38.5°C',
        '⏱️ 30-40 min/sessão',
        '💧 Hidratação frequente',
        '🔴 NÃO deitar completamente de costas (risco de compressão da veia cava)',
        '🚫 Evitar movimentos balísticos e amplitudes extremas',
        '📍 Desconfortos comuns: dor lombar, cansaço, inchaço — adaptar conforme necessário',
      ],
    },
  },

  // ------------------------------------------------------------------
  // 3º TRIMESTRE A — Redução Gradual (28-35 sem)
  // ------------------------------------------------------------------
  GESTANTE_T3_A: {
    phase: 'GESTANTE_T3_A',
    phaseLabel: 'Gestante — 3º Trimestre (28-35 sem)',
    trimester: 3,
    gestationalWeeksRange: '28-35',
    sessionsPerWeek: 3,
    maxHeartRate: 140,
    maxTemp: 38.5,
    session: {
      title: 'Sessão Gestante T3-A',
      estimatedDuration: 30,
      warmup: {
        ...WARMUP_BASE,
        exercises: [
          { name: 'Caminhada leve no lugar', reps: '2 min' },
          { name: 'Mobilidade de ombros e quadril (sentada)', reps: '1 min' },
          { name: 'Respiração diafragmática profunda', reps: '10 ciclos' },
          { name: 'Ativação glúteos (ponte leve)', reps: '2x8' },
        ],
      },
      blocks: [
        {
          name: 'Membros Inferiores (Reduzido)',
          icon: '🦵',
          duration: '8 min',
          exercises: [
            { name: 'Agachamento parcial com apoio (cadeira)', reps: '3x8', notes: 'Sentar na cadeira e levantar' },
            { name: 'Extensão de quadril em pé', reps: '2x10 cada', notes: 'Segurar na parede' },
            { name: 'Panturrilha com apoio', reps: '2x12' },
          ],
        },
        {
          name: 'Membros Superiores (Leve)',
          icon: '💪',
          duration: '6 min',
          exercises: [
            { name: 'Remada com elástico (sentada)', reps: '2x12' },
            { name: 'Elevação frontal alternada (halter leve)', reps: '2x10', notes: 'Máx 1-2kg' },
            { name: 'Rosca punho (fortalecimento mão/punho)', reps: '2x15' },
          ],
        },
        {
          name: 'Mobilidade + Assoalho Pélvico',
          icon: '🎯',
          duration: '8 min',
          exercises: [
            { name: 'Kegel progressivo', reps: '3x10', notes: 'Contrair 8s, relaxar 8s' },
            { name: 'Mobilidade de quadril (círculos na bola)', reps: '2x8 cada', notes: 'Sentada na bola suíça' },
            { name: 'Respiração para parto (expiração longa)', reps: '10 ciclos' },
            { name: 'Cat-Cow suave', reps: '2x8', notes: 'Aliviar dor lombar' },
          ],
        },
      ],
      stretching: {
        ...STRETCHING_BASE,
        exercises: [
          { name: 'Alongamento lateral (sentada)', reps: '30s cada' },
          { name: 'Abertura de quadril (borboleta)', reps: '30s', notes: 'Suave, sem forçar' },
          { name: 'Alongamento trapézio/pescoço', reps: '20s cada', notes: 'Aliviar tensão cervical' },
          { name: 'Alongamento panturrilha (na parede)', reps: '30s cada' },
        ],
      },
      relaxation: {
        ...RELAXATION_BASE,
        duration: '5 min',
        exercises: [
          { name: 'Respiração 4-7-8', reps: '5 ciclos' },
          { name: 'Relaxamento progressivo (deitada de lado esquerdo)', reps: '3 min' },
          { name: 'Visualização positiva para o parto', reps: '2 min' },
        ],
      },
      safetyNotes: [
        '❤️ FC máxima: 140 bpm — intensidade LEVE neste período',
        '🌡️ Temperatura < 38.5°C',
        '⏱️ 30 min/sessão (reduzir se necessário)',
        '💧 Hidratação constante',
        '🔴 NÃO deitar de costas',
        '📍 Desconfortos aumentam: falta de ar, inchaço, cansaço — respeitar os limites',
        '🦶 Atenção ao inchaço nos pés e pernas — elevar após o treino',
        '⚠️ Frequência urinária aumentada — permitir pausas',
      ],
    },
  },

  // ------------------------------------------------------------------
  // 3º TRIMESTRE B — Pré-Parto (36-42 sem)
  // ------------------------------------------------------------------
  GESTANTE_T3_B: {
    phase: 'GESTANTE_T3_B',
    phaseLabel: 'Gestante — Pré-Parto (36-42 sem)',
    trimester: 3,
    gestationalWeeksRange: '36-42',
    sessionsPerWeek: 2, // Reduzido para 2x/semana
    maxHeartRate: 130,  // Mais conservador
    maxTemp: 38.5,
    session: {
      title: 'Sessão Gestante Pré-Parto',
      estimatedDuration: 25,
      warmup: {
        name: 'Aquecimento Suave',
        icon: '🔥',
        duration: '5 min',
        exercises: [
          { name: 'Caminhada lenta', reps: '2 min' },
          { name: 'Mobilidade de quadril (sentada na bola)', reps: '2 min' },
          { name: 'Respiração consciente', reps: '8 ciclos' },
        ],
      },
      blocks: [
        {
          name: 'Fortalecimento Suave',
          icon: '🦵',
          duration: '8 min',
          exercises: [
            { name: 'Agachamento na parede (isométrico)', reps: '3x20s', notes: 'Com bola nas costas' },
            { name: 'Ponte glútea leve', reps: '2x10' },
            { name: 'Mini agachamento com apoio', reps: '2x8' },
          ],
        },
        {
          name: 'Preparação para o Parto',
          icon: '🎯',
          duration: '10 min',
          exercises: [
            { name: 'Kegel intensificado', reps: '3x12', notes: 'Contrair 10s, relaxar 10s — preparar para o parto' },
            { name: 'Posição de cócoras com apoio', reps: '3x30s', notes: 'Abrir espaço pélvico' },
            { name: 'Mobilidade na bola suíça (círculos/balanço)', reps: '3 min' },
            { name: 'Respiração de parto (expiração controlada)', reps: '10 ciclos', notes: 'Inspirar 4s, expirar 8s' },
            { name: 'Relaxamento do assoalho pélvico', reps: '2x8', notes: 'Aprender a relaxar a musculatura' },
          ],
        },
      ],
      stretching: {
        name: 'Alongamento Preparatório',
        icon: '🧘',
        duration: '5 min',
        exercises: [
          { name: 'Abertura de quadril (borboleta suave)', reps: '30s' },
          { name: 'Alongamento adutor (sentada)', reps: '30s' },
          { name: 'Alongamento lombar (gato/camelo)', reps: '8 reps' },
          { name: 'Alongamento lateral tronco', reps: '20s cada' },
        ],
      },
      relaxation: {
        name: 'Relaxamento Profundo',
        icon: '💆',
        duration: '5 min',
        exercises: [
          { name: 'Respiração 4-7-8 progressiva', reps: '8 ciclos' },
          { name: 'Relaxamento muscular completo (deitada de lado)', reps: '3 min' },
          { name: 'Visualização do parto positivo', reps: '2 min' },
        ],
      },
      safetyNotes: [
        '❤️ FC máxima: 130 bpm — intensidade MUITO LEVE',
        '🌡️ Temperatura < 38.5°C',
        '⏱️ 25 min/sessão máximo',
        '💧 Hidratação constante',
        '🔴 NÃO deitar de costas NUNCA',
        '🏥 Liberação médica atualizada obrigatória',
        '⚠️ Parar IMEDIATAMENTE: contrações regulares, sangramento, perda de líquido',
        '🦶 Atenção redobrada ao equilíbrio — centro de gravidade muito alterado',
        '📞 Manter contato com obstetra para qualquer dúvida',
      ],
    },
  },
}

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Retorna o template de treino gestante para a fase informada.
 */
export function getGestanteWorkout(phase: TrainingPhase): GestantePhaseTemplate | null {
  return GESTANTE_TEMPLATES[phase] || null
}

/**
 * Retorna a fase gestante recomendada com base na semana gestacional.
 */
export function getRecommendedGestantePhase(gestationalWeek: number): TrainingPhase {
  if (gestationalWeek <= 12) return 'GESTANTE_T1'
  if (gestationalWeek <= 27) return 'GESTANTE_T2'
  if (gestationalWeek <= 35) return 'GESTANTE_T3_A'
  return 'GESTANTE_T3_B'
}

/**
 * Verifica se uma fase é do tipo gestante.
 */
export function isGestantePhase(phase: string): boolean {
  return phase.startsWith('GESTANTE_')
}
