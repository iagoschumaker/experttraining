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
  SUPERADMIN_PHASES: '/superadmin/phases',
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
