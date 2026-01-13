// ============================================================================
// EXPERT TRAINING - BACKUP STORAGE MANAGER
// ============================================================================
// Gerencia armazenamento local de backups em arquivos JSON
// ============================================================================

import fs from 'fs'
import path from 'path'
import { BackupData, BackupMetadata } from './index'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

// Ensure backup directory exists
export function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    console.log(`📁 Diretório de backup criado: ${BACKUP_DIR}`)
  }
}

// Get backup file path
function getBackupPath(backupId: string): string {
  return path.join(BACKUP_DIR, `${backupId}.json`)
}

// Get metadata file path
function getMetadataPath(): string {
  return path.join(BACKUP_DIR, 'metadata.json')
}

// Save backup to file
export async function saveBackup(backup: BackupData): Promise<void> {
  ensureBackupDir()
  
  const filePath = getBackupPath(backup.metadata.id)
  const content = JSON.stringify(backup, null, 2)
  
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`💾 Backup salvo: ${filePath}`)
  
  // Update metadata index
  await updateMetadataIndex(backup.metadata)
}

// Load backup from file
export async function loadBackup(backupId: string): Promise<BackupData | null> {
  const filePath = getBackupPath(backupId)
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Backup não encontrado: ${backupId}`)
    return null
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(content) as BackupData
}

// Delete backup file
export async function deleteBackup(backupId: string): Promise<boolean> {
  const filePath = getBackupPath(backupId)
  
  if (!fs.existsSync(filePath)) {
    return false
  }
  
  fs.unlinkSync(filePath)
  console.log(`🗑️ Backup deletado: ${backupId}`)
  
  // Update metadata index
  await removeFromMetadataIndex(backupId)
  
  return true
}

// List all backups metadata
export async function listBackups(): Promise<BackupMetadata[]> {
  ensureBackupDir()
  
  const metadataPath = getMetadataPath()
  
  if (!fs.existsSync(metadataPath)) {
    return []
  }
  
  const content = fs.readFileSync(metadataPath, 'utf8')
  const metadata = JSON.parse(content) as BackupMetadata[]
  
  // Sort by date descending (most recent first)
  return metadata.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Update metadata index file
async function updateMetadataIndex(newMetadata: BackupMetadata): Promise<void> {
  const metadataPath = getMetadataPath()
  let allMetadata: BackupMetadata[] = []
  
  if (fs.existsSync(metadataPath)) {
    const content = fs.readFileSync(metadataPath, 'utf8')
    allMetadata = JSON.parse(content)
  }
  
  // Remove existing entry with same ID if any
  allMetadata = allMetadata.filter(m => m.id !== newMetadata.id)
  
  // Add new metadata
  allMetadata.push(newMetadata)
  
  fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2), 'utf8')
}

// Remove from metadata index
async function removeFromMetadataIndex(backupId: string): Promise<void> {
  const metadataPath = getMetadataPath()
  
  if (!fs.existsSync(metadataPath)) {
    return
  }
  
  const content = fs.readFileSync(metadataPath, 'utf8')
  let allMetadata = JSON.parse(content) as BackupMetadata[]
  
  allMetadata = allMetadata.filter(m => m.id !== backupId)
  
  fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2), 'utf8')
}

// Get backup file size from disk
export function getBackupFileSize(backupId: string): number {
  const filePath = getBackupPath(backupId)
  
  if (!fs.existsSync(filePath)) {
    return 0
  }
  
  const stats = fs.statSync(filePath)
  return stats.size
}

// Get raw backup file content for download
export async function getBackupFileContent(backupId: string): Promise<string | null> {
  const filePath = getBackupPath(backupId)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  return fs.readFileSync(filePath, 'utf8')
}

// Import backup from uploaded content
export async function importBackup(content: string): Promise<BackupData | null> {
  try {
    const backup = JSON.parse(content) as BackupData
    
    // Validate structure
    if (!backup.metadata || !backup.data) {
      throw new Error('Estrutura de backup inválida')
    }
    
    // Save to storage
    await saveBackup(backup)
    
    return backup
  } catch (error) {
    console.error('❌ Erro ao importar backup:', error)
    return null
  }
}
