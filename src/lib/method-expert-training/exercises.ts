import { ExerciseDef } from './types'

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'ex_squat_box',
    name: 'Box Squat - Controle de profundidade',
    patterns: ['squat'],
    primary_capacity: 'strength',
    risk_level: 'moderado',
    contraindications: ['dor lombar aguda'],
    default_rest_seconds: 60,
  },
  {
    id: 'ex_hip_hinge_ramp',
    name: 'Hinge Segmentado (hip hinge) - controle de quadril',
    patterns: ['hinge'],
    primary_capacity: 'stability',
    risk_level: 'moderado',
    contraindications: ['dor lombar aguda'],
    default_rest_seconds: 60,
  },
  {
    id: 'ex_lunge_split',
    name: 'Lunge com controle (split lunge)',
    patterns: ['lunge'],
    primary_capacity: 'coordination',
    risk_level: 'baixo',
    default_rest_seconds: 45,
  },
  {
    id: 'ex_integrated_push_pull_landmine',
    name: 'Landmine Press (integrado push+pull)',
    patterns: ['push', 'pull'],
    primary_capacity: 'strength',
    risk_level: 'moderado',
    default_rest_seconds: 45,
  },
  {
    id: 'ex_core_anti_rotation',
    name: 'Core Anti-Rotation (band/half-kneel)',
    patterns: ['rotation'],
    primary_capacity: 'stability',
    risk_level: 'baixo',
    default_rest_seconds: 30,
  },
  {
    id: 'ex_gait_step_over',
    name: 'Gait Step-over (coordenação de marcha)',
    patterns: ['gait'],
    primary_capacity: 'coordination',
    risk_level: 'baixo',
    default_rest_seconds: 30,
  },
]
