// ============================================================================
// MOTOR DE DECISÃO — CATÁLOGO DE EXERCÍCIOS
// ============================================================================
// Catálogo base de exercícios funcionais do Método EXPERT PRO TRAINING
// ============================================================================

import { ExerciseCatalogEntry } from './types'

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // =========================================================================
  // EXERCÍCIOS DE FOCO (SLOT: FOCUS)
  // =========================================================================
  {
    id: 'focus_squat_box',
    name: 'Box Squat com Controle',
    patterns: ['squat'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '8-10' },
    defaultRest: 60,
    contraindications: ['dor_joelho_aguda', 'dor_lombar_aguda'],
    riskLevel: 'MODERADO',
  },
  {
    id: 'focus_squat_goblet',
    name: 'Goblet Squat',
    patterns: ['squat'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '10-12' },
    defaultRest: 45,
    contraindications: ['dor_joelho_aguda'],
    riskLevel: 'BAIXO',
  },
  {
    id: 'focus_hinge_rdl',
    name: 'Romanian Deadlift (RDL)',
    patterns: ['hinge'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '8-10' },
    defaultRest: 60,
    contraindications: ['dor_lombar_aguda', 'hérnia_discal'],
    riskLevel: 'MODERADO',
  },
  {
    id: 'focus_hinge_hip_hinge',
    name: 'Hip Hinge com Bastão',
    patterns: ['hinge'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '10-12' },
    defaultRest: 45,
    contraindications: ['dor_lombar_aguda'],
    riskLevel: 'BAIXO',
  },
  {
    id: 'focus_lunge_split',
    name: 'Split Squat Estático',
    patterns: ['lunge'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '8-10/lado' },
    defaultRest: 45,
    contraindications: ['dor_joelho_aguda'],
    riskLevel: 'BAIXO',
  },
  {
    id: 'focus_lunge_reverse',
    name: 'Reverse Lunge',
    patterns: ['lunge'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '8-10/lado' },
    defaultRest: 45,
    contraindications: ['dor_joelho_aguda', 'instabilidade_tornozelo'],
    riskLevel: 'MODERADO',
  },
  {
    id: 'focus_gait_step_over',
    name: 'Step Over com Controle',
    patterns: ['gait'],
    slot: 'FOCUS',
    defaultExecution: { type: 'TIME', value: '45s' },
    defaultRest: 30,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'focus_rotation_chop',
    name: 'Cable Chop (diagonal)',
    patterns: ['rotation'],
    slot: 'FOCUS',
    defaultExecution: { type: 'REPS', value: '10-12/lado' },
    defaultRest: 45,
    contraindications: ['dor_lombar_aguda'],
    riskLevel: 'MODERADO',
  },

  // =========================================================================
  // EXERCÍCIOS INTEGRADOS PUSH+PULL (SLOT: INTEGRATED_PUSH_PULL)
  // =========================================================================
  {
    id: 'integrated_landmine_press',
    name: 'Landmine Press Unilateral',
    patterns: ['push', 'pull'],
    slot: 'INTEGRATED_PUSH_PULL',
    defaultExecution: { type: 'REPS', value: '8-10/lado' },
    defaultRest: 45,
    contraindications: ['dor_ombro_aguda'],
    riskLevel: 'MODERADO',
  },
  {
    id: 'integrated_push_pull_cable',
    name: 'Push-Pull Cable Alternado',
    patterns: ['push', 'pull'],
    slot: 'INTEGRATED_PUSH_PULL',
    defaultExecution: { type: 'REPS', value: '10-12' },
    defaultRest: 45,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'integrated_trx_row_press',
    name: 'TRX Row to Press',
    patterns: ['push', 'pull'],
    slot: 'INTEGRATED_PUSH_PULL',
    defaultExecution: { type: 'REPS', value: '8-10' },
    defaultRest: 45,
    contraindications: ['dor_ombro_aguda'],
    riskLevel: 'MODERADO',
  },
  {
    id: 'integrated_kettlebell_clean_press',
    name: 'Kettlebell Clean & Press',
    patterns: ['push', 'pull', 'hinge'],
    slot: 'INTEGRATED_PUSH_PULL',
    defaultExecution: { type: 'REPS', value: '6-8/lado' },
    defaultRest: 60,
    contraindications: ['dor_ombro_aguda', 'dor_lombar_aguda'],
    riskLevel: 'ALTO',
  },
  {
    id: 'integrated_renegade_row',
    name: 'Renegade Row',
    patterns: ['push', 'pull'],
    slot: 'INTEGRATED_PUSH_PULL',
    defaultExecution: { type: 'REPS', value: '6-8/lado' },
    defaultRest: 60,
    contraindications: ['dor_punho', 'dor_ombro_aguda'],
    riskLevel: 'ALTO',
  },

  // =========================================================================
  // EXERCÍCIOS DE CORE (SLOT: CORE)
  // =========================================================================
  {
    id: 'core_anti_rotation_pallof',
    name: 'Pallof Press (Anti-Rotação)',
    patterns: ['rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'TIME', value: '30s/lado' },
    defaultRest: 20,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'core_anti_extension_plank',
    name: 'Plank (Anti-Extensão)',
    patterns: ['rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'TIME', value: '30-45s' },
    defaultRest: 20,
    contraindications: ['dor_ombro_aguda'],
    riskLevel: 'BAIXO',
  },
  {
    id: 'core_anti_flexion_deadbug',
    name: 'Dead Bug (Anti-Flexão)',
    patterns: ['rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'REPS', value: '8-10/lado' },
    defaultRest: 20,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'core_anti_lateral_suitcase',
    name: 'Suitcase Carry (Anti-Lateral)',
    patterns: ['gait', 'rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'TIME', value: '30s/lado' },
    defaultRest: 30,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'core_bird_dog',
    name: 'Bird Dog',
    patterns: ['rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'REPS', value: '8-10/lado' },
    defaultRest: 20,
    contraindications: [],
    riskLevel: 'BAIXO',
  },
  {
    id: 'core_hollow_hold',
    name: 'Hollow Body Hold',
    patterns: ['rotation'],
    slot: 'CORE',
    defaultExecution: { type: 'TIME', value: '30-45s' },
    defaultRest: 30,
    contraindications: ['dor_lombar_aguda'],
    riskLevel: 'MODERADO',
  },
]

// =========================================================================
// FUNÇÕES DE BUSCA NO CATÁLOGO
// =========================================================================

export function findFocusExercises(
  pattern: string,
  blockedPatterns: string[] = [],
  blockedContraindications: string[] = []
): ExerciseCatalogEntry[] {
  return EXERCISE_CATALOG.filter(
    (ex) =>
      ex.slot === 'FOCUS' &&
      ex.patterns.includes(pattern as any) &&
      !ex.patterns.some((p) => blockedPatterns.includes(p)) &&
      !ex.contraindications.some((c) => blockedContraindications.includes(c))
  )
}

export function findIntegratedExercises(
  blockedContraindications: string[] = [],
  riskLevel?: 'BAIXO' | 'MODERADO' | 'ALTO'
): ExerciseCatalogEntry[] {
  return EXERCISE_CATALOG.filter(
    (ex) =>
      ex.slot === 'INTEGRATED_PUSH_PULL' &&
      !ex.contraindications.some((c) => blockedContraindications.includes(c)) &&
      (riskLevel === undefined || ex.riskLevel === riskLevel || 
       (riskLevel === 'MODERADO' && ex.riskLevel !== 'ALTO') ||
       (riskLevel === 'ALTO'))
  )
}

export function findCoreExercises(
  blockedContraindications: string[] = [],
  priorityType?: 'anti_rotation' | 'anti_extension' | 'anti_flexion'
): ExerciseCatalogEntry[] {
  let results = EXERCISE_CATALOG.filter(
    (ex) =>
      ex.slot === 'CORE' &&
      !ex.contraindications.some((c) => blockedContraindications.includes(c))
  )

  if (priorityType === 'anti_rotation') {
    results = results.filter((ex) => ex.name.toLowerCase().includes('anti-rotação') || ex.id.includes('anti_rotation'))
  } else if (priorityType === 'anti_extension') {
    results = results.filter((ex) => ex.name.toLowerCase().includes('anti-extensão') || ex.id.includes('anti_extension'))
  }

  return results.length > 0 ? results : EXERCISE_CATALOG.filter((ex) => ex.slot === 'CORE')
}
