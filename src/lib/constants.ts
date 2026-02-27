// ============================================================================
// EXPERT PRO TRAINING - CONSTANTS
// ============================================================================
// Constantes globais do sistema
// ============================================================================

// ============================================================================
// ROUTES
// ============================================================================

export const ROUTES = {
  // Public
  LOGIN: '/login',
  SELECT_STUDIO: '/select-studio',

  // App (Studios)
  APP: '/',
  APP_DASHBOARD: '/dashboard',
  APP_CLIENTS: '/clients',
  APP_ASSESSMENTS: '/assessments',
  APP_RESULTS: '/results',
  APP_WORKOUTS: '/workouts',

  // SuperAdmin
  SUPERADMIN: '/superadmin',
  SUPERADMIN_DASHBOARD: '/superadmin/dashboard',
  SUPERADMIN_STUDIOS: '/superadmin/studios',
  SUPERADMIN_PLANS: '/superadmin/plans',
  SUPERADMIN_USERS: '/superadmin/users',
  SUPERADMIN_BLOCKS: '/superadmin/blocks',
  SUPERADMIN_RULES: '/superadmin/rules',
} as const

// ============================================================================
// ROLES
// ============================================================================

export const ROLES = {
  STUDIO_ADMIN: 'STUDIO_ADMIN',
  TRAINER: 'TRAINER',
} as const

export const ROLE_LABELS: Record<string, string> = {
  STUDIO_ADMIN: 'Administrador',
  TRAINER: 'Treinador',
}

// ============================================================================
// STUDIO STATUS
// ============================================================================

export const STUDIO_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const

export const STUDIO_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
}

// ============================================================================
// PHYSICAL CAPACITIES (Capacidades Físicas)
// ============================================================================

export const PHYSICAL_CAPACITIES = {
  MOBILITY: 'MOBILITY',
  STABILITY: 'STABILITY',
  STRENGTH: 'STRENGTH',
  POWER: 'POWER',
  ENDURANCE: 'ENDURANCE',
  COORDINATION: 'COORDINATION',
} as const

export const PHYSICAL_CAPACITY_LABELS: Record<string, string> = {
  MOBILITY: 'Mobilidade',
  STABILITY: 'Estabilidade',
  STRENGTH: 'Força',
  POWER: 'Potência',
  ENDURANCE: 'Resistência',
  COORDINATION: 'Coordenação',
}

// ============================================================================
// MOVEMENT PATTERNS (Padrões de Movimento)
// ============================================================================

export const MOVEMENT_PATTERNS = {
  SQUAT: 'SQUAT',
  HINGE: 'HINGE',
  LUNGE: 'LUNGE',
  PUSH: 'PUSH',
  PULL: 'PULL',
  ROTATION: 'ROTATION',
  GAIT: 'GAIT',
  CARRY: 'CARRY',
} as const

export const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  SQUAT: 'Agachamento',
  HINGE: 'Dobradiça',
  LUNGE: 'Avanço',
  PUSH: 'Empurrar',
  PULL: 'Puxar',
  ROTATION: 'Rotação',
  GAIT: 'Marcha',
  CARRY: 'Transporte',
}

// ============================================================================
// RISK LEVELS
// ============================================================================

export const RISK_LEVELS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: 'Baixo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
}

// ============================================================================
// ASSESSMENT LEVELS
// ============================================================================

export const LEVELS = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
}

// ============================================================================
// MOVEMENT TEST SCORES
// ============================================================================

export const MOVEMENT_SCORE_LABELS: Record<number, string> = {
  0: 'Não consegue executar',
  1: 'Com compensação significativa',
  2: 'Funcional',
  3: 'Excelente',
}

// ============================================================================
// BODY PARTS (for pain map)
// ============================================================================

export const BODY_PARTS = {
  NECK: 'neck',
  UPPER_BACK: 'upper_back',
  LOWER_BACK: 'lower_back',
  SHOULDER_LEFT: 'shoulder_left',
  SHOULDER_RIGHT: 'shoulder_right',
  ELBOW_LEFT: 'elbow_left',
  ELBOW_RIGHT: 'elbow_right',
  WRIST_LEFT: 'wrist_left',
  WRIST_RIGHT: 'wrist_right',
  HIP_LEFT: 'hip_left',
  HIP_RIGHT: 'hip_right',
  KNEE_LEFT: 'knee_left',
  KNEE_RIGHT: 'knee_right',
  ANKLE_LEFT: 'ankle_left',
  ANKLE_RIGHT: 'ankle_right',
} as const

export const BODY_PART_LABELS: Record<string, string> = {
  neck: 'Cervical',
  upper_back: 'Torácica',
  lower_back: 'Lombar',
  shoulder_left: 'Ombro Esquerdo',
  shoulder_right: 'Ombro Direito',
  elbow_left: 'Cotovelo Esquerdo',
  elbow_right: 'Cotovelo Direito',
  wrist_left: 'Punho Esquerdo',
  wrist_right: 'Punho Direito',
  hip_left: 'Quadril Esquerdo',
  hip_right: 'Quadril Direito',
  knee_left: 'Joelho Esquerdo',
  knee_right: 'Joelho Direito',
  ankle_left: 'Tornozelo Esquerdo',
  ankle_right: 'Tornozelo Direito',
}

// ============================================================================
// COOKIES
// ============================================================================

export const COOKIES = {
  ACCESS_TOKEN: 'expert_access_token',
  REFRESH_TOKEN: 'expert_refresh_token',
  STUDIO_CONTEXT: 'expert_studio_context',
} as const

// ============================================================================
// PAGINATION
// ============================================================================

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

// ============================================================================
// TRAINING PILLARS (Pilares do Método)
// ============================================================================

export const TRAINING_PILLARS = {
  LOWER: 'LOWER',
  PUSH: 'PUSH',
  PULL: 'PULL',
} as const

export const PILLAR_LABELS: Record<string, string> = {
  LOWER: 'Perna & Quadril',
  PUSH: 'Empurrada',
  PULL: 'Puxada',
}

