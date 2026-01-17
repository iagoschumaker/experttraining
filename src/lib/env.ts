// ============================================================================
// EXPERT PRO TRAINING - ENVIRONMENT CONFIGURATION
// ============================================================================
// Configurações centralizadas e validadas do ambiente
// ============================================================================

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Valida e exporta as variáveis de ambiente
function getEnv() {
  const parsed = envSchema.safeParse(process.env)
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }
  
  return parsed.data
}

export const env = getEnv()

// Constantes derivadas
export const IS_PRODUCTION = env.NODE_ENV === 'production'
export const IS_DEVELOPMENT = env.NODE_ENV === 'development'
