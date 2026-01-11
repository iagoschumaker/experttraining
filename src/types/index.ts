// ============================================================================
// EXPERT TRAINING - TYPES
// ============================================================================
// Tipos TypeScript centralizados
// ============================================================================

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface JWTPayload {
  userId: string
  isSuperAdmin: boolean
  iat?: number
  exp?: number
}

export interface JWTPayloadWithStudio extends JWTPayload {
  studioId: string
  role: UserStudioRole
  studioName: string
}

export type UserStudioRole = 'STUDIO_ADMIN' | 'TRAINER'

export type StudioStatus = 'ACTIVE' | 'SUSPENDED'

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserWithStudios extends User {
  studios: UserStudioLink[]
}

export interface UserStudioLink {
  id: string
  studioId: string
  studioName: string
  studioSlug: string
  studioStatus: StudioStatus
  role: UserStudioRole
  joinedAt: Date
}

// ============================================================================
// STUDIO TYPES
// ============================================================================

export interface Studio {
  id: string
  name: string
  slug: string
  status: StudioStatus
  planId: string | null
  logoUrl: string | null
  settings: StudioSettings
  createdAt: Date
  updatedAt: Date
}

export interface StudioSettings {
  theme?: 'light' | 'dark' | 'system'
  timezone?: string
  language?: string
}

// ============================================================================
// CLIENT TYPES
// ============================================================================

export interface Client {
  id: string
  studioId: string
  trainerId: string | null
  name: string
  email: string | null
  phone: string | null
  birthDate: Date | null
  gender: string | null
  height: number | null
  weight: number | null
  history: string | null
  objectives: string | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ASSESSMENT TYPES
// ============================================================================

export type AssessmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'

export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export interface AssessmentInput {
  complaints: string[]
  painMap: Record<string, number> // body_part: intensity (0-10)
  movementTests: MovementTests
  level: Level
}

export interface MovementTests {
  squat: MovementTestResult
  hinge: MovementTestResult
  lunge: MovementTestResult
  push: MovementTestResult
  pull: MovementTestResult
  rotation: MovementTestResult
  gait: MovementTestResult
}

export interface MovementTestResult {
  score: number // 0-3 (0=não consegue, 1=com compensação, 2=funcional, 3=excelente)
  observations: string
}

export interface AssessmentResult {
  functionalPattern: string
  primaryFocus: string
  secondaryFocus: string[]
  allowedBlocks: (string | Block)[]
  blockedBlocks: string[]
  recommendations: string[]
  confidence: number // 0-100
  focus?: {
    primary: string[]
    secondary: string[]
  }
}

export interface Assessment {
  id: string
  clientId: string
  assessorId: string
  status: AssessmentStatus
  inputJson: AssessmentInput
  resultJson: AssessmentResult | null
  confidence: number | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// BLOCK TYPES
// ============================================================================

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export type PhysicalCapacity = 
  | 'MOBILITY' 
  | 'STABILITY' 
  | 'STRENGTH' 
  | 'POWER' 
  | 'ENDURANCE' 
  | 'COORDINATION'

export type MovementPattern = 
  | 'SQUAT' 
  | 'HINGE' 
  | 'LUNGE' 
  | 'PUSH' 
  | 'PULL' 
  | 'ROTATION' 
  | 'GAIT' 
  | 'CARRY'

export interface BlockExercise {
  name: string
  sets: number
  reps: string
  rest?: string
  notes?: string
}

export interface Block {
  id: string
  code: string
  name: string
  description: string | null
  level: number
  primaryCapacity: PhysicalCapacity
  secondaryCapacities: PhysicalCapacity[]
  movementPattern: MovementPattern | null
  riskLevel: RiskLevel
  contraindications: string[]
  exercises: BlockExercise[]
  prerequisiteBlockId: string | null
  progressionBlockId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// RULE TYPES (MOTOR DE DECISÃO)
// ============================================================================

export type RuleOperator = 'AND' | 'OR'
export type ConditionOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains'

export interface RuleCondition {
  field: string // Ex: "painMap.lower_back", "movementTests.squat.score"
  operator: ConditionOperator
  value: string | number | boolean
}

export interface RuleConditionGroup {
  operator: RuleOperator
  conditions: RuleCondition[]
}

export interface Rule {
  id: string
  name: string
  description: string | null
  conditionJson: RuleConditionGroup
  allowedBlocks: string[]
  blockedBlocks: string[]
  recommendations: string[]
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// WORKOUT TYPES
// ============================================================================

export interface WorkoutSchedule {
  warmup: string[]
  main: string[]
  cooldown: string[]
  notes?: string
}

export interface Workout {
  id: string
  clientId: string
  studioId: string
  createdById: string
  name: string | null
  blocksUsed: string[]
  scheduleJson: WorkoutSchedule
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================================================
// PLAN TYPES
// ============================================================================

export interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  priceYearly: number | null
  maxTrainers: number
  maxClients: number
  features: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
