// ============================================================================
// EXPERT TRAINING - PASSWORD SERVICE
// ============================================================================
// Hashing e verificação de senhas com bcrypt
// ============================================================================

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Gera hash de uma senha
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifica se a senha corresponde ao hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
