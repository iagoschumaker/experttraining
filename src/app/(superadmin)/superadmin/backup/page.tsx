'use client'

// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN BACKUP PAGE
// ============================================================================
// Gerenciamento completo de backups do sistema
// ============================================================================

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Database,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Plus,
  FileJson,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Users,
  Building2,
  Shield,
  RefreshCw,
  Info,
  FileArchive,
} from 'lucide-react'

interface BackupMetadata {
  id: string
  name: string
  description: string | null
  createdAt: string
  createdBy: string
  createdByName: string
  size: number
  sizeFormatted: string
  tablesIncluded: string[]
  recordCounts: Record<string, number>
  totalRecords: number
  version: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED'
  checksum: string
}

export default function SuperAdminBackupPage() {
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null)
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRestoreOpen, setIsRestoreOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  // Form
  const [description, setDescription] = useState('')
  const [restoreOptions, setRestoreOptions] = useState({
    clearExisting: false,
    skipUsers: false,
    skipAuditLogs: true,
  })
  
  // File input
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/backup')
      const data = await res.json()
      if (data.success) {
        setBackups(data.data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/superadmin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (data.success) {
        setBackups(prev => [data.data, ...prev])
        setIsCreateOpen(false)
        setDescription('')
        alert('✅ Backup criado com sucesso!')
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Erro ao criar backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (backup: BackupMetadata) => {
    try {
      const res = await fetch(`/api/superadmin/backup/${backup.id}/download`)
      if (!res.ok) {
        alert('❌ Erro ao baixar backup')
        return
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${backup.id}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Erro ao baixar backup')
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) return
    
    if (!confirm(`⚠️ ATENÇÃO: Você está prestes a restaurar o backup "${selectedBackup.id}".\n\nIsso pode sobrescrever dados existentes. Deseja continuar?`)) {
      return
    }
    
    setRestoring(true)
    try {
      const res = await fetch(`/api/superadmin/backup/${selectedBackup.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreOptions),
      })
      const data = await res.json()
      if (data.success) {
        setIsRestoreOpen(false)
        alert(`✅ ${data.message}`)
      } else {
        alert('❌ Erro: ' + data.error + (data.details ? '\n' + data.details.join('\n') : ''))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Erro ao restaurar backup')
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBackup) return
    
    try {
      const res = await fetch(`/api/superadmin/backup/${selectedBackup.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setBackups(prev => prev.filter(b => b.id !== selectedBackup.id))
        setIsDeleteOpen(false)
        setSelectedBackup(null)
        alert('✅ Backup deletado com sucesso!')
      } else {
        alert('❌ Erro: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Erro ao deletar backup')
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      
      const res = await fetch('/api/superadmin/backup/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setBackups(prev => [data.data, ...prev])
        setIsImportOpen(false)
        setImportFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        alert('✅ Backup importado com sucesso!')
      } else {
        alert('❌ Erro: ' + data.error + (data.details ? '\n' + data.details.join('\n') : ''))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Erro ao importar backup')
    } finally {
      setImporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completo</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Em progresso</Badge>
      case 'FAILED':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Stats
  const totalBackups = backups.length
  const totalSize = backups.reduce((acc, b) => acc + b.size, 0)
  const lastBackup = backups[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Backup & Restauração
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie backups completos do sistema para proteção de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total de Backups"
          value={totalBackups}
          icon={<FileArchive className="w-4 h-4" />}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatsCard
          title="Espaço Utilizado"
          value={`${(totalSize / (1024 * 1024)).toFixed(2)} MB`}
          icon={<HardDrive className="w-4 h-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Último Backup"
          value={lastBackup ? formatDate(lastBackup.createdAt).split(' ')[0] : '-'}
          icon={<Clock className="w-4 h-4" />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <StatsCard
          title="Registros (último)"
          value={lastBackup ? lastBackup.totalRecords.toLocaleString() : '-'}
          icon={<Shield className="w-4 h-4" />}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />
      </StatsGrid>

      {/* Info Card */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-500">Sobre os Backups</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os backups são salvos em formato JSON e incluem todos os dados do sistema: 
                usuários, studios, clientes, avaliações, treinos, aulas, planos, faturas e mais.
                Você pode baixar os backups e guardá-los em local seguro, ou restaurar a partir
                de qualquer backup salvo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Backups Disponíveis</CardTitle>
            <CardDescription>Lista de todos os backups do sistema</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchBackups}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum backup encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Crie seu primeiro backup para proteger os dados do sistema.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Backup
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {backups.map((backup) => (
                  <div key={backup.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-xs text-muted-foreground">{backup.id}</div>
                      {getStatusBadge(backup.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-muted-foreground">Data:</span> {formatDate(backup.createdAt)}</div>
                      <div><span className="text-muted-foreground">Por:</span> {backup.createdByName}</div>
                      <div><span className="text-muted-foreground">Registros:</span> {backup.totalRecords.toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Tamanho:</span> {backup.sizeFormatted}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedBackup(backup); setIsDetailsOpen(true) }}>
                        <Info className="w-4 h-4 mr-1" /> Detalhes
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(backup)}><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedBackup(backup); setIsRestoreOpen(true) }}><RotateCcw className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelectedBackup(backup); setIsDeleteOpen(true) }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Criado por</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-mono text-sm">{backup.id}</TableCell>
                        <TableCell>{formatDate(backup.createdAt)}</TableCell>
                        <TableCell>{backup.createdByName}</TableCell>
                        <TableCell>{backup.totalRecords.toLocaleString()}</TableCell>
                        <TableCell>{backup.sizeFormatted}</TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => { setSelectedBackup(backup); setIsDetailsOpen(true) }}><Info className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" title="Baixar backup" onClick={() => handleDownload(backup)}><Download className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" title="Restaurar" onClick={() => { setSelectedBackup(backup); setIsRestoreOpen(true) }}><RotateCcw className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" title="Deletar" className="text-destructive hover:text-destructive" onClick={() => { setSelectedBackup(backup); setIsDeleteOpen(true) }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Novo Backup
            </DialogTitle>
            <DialogDescription>
              Será criado um backup completo de todos os dados do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Ex: Backup antes da atualização do sistema..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">O backup incluirá:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Todos os usuários e permissões</li>
                <li>• Todos os studios e configurações</li>
                <li>• Clientes, avaliações e treinos</li>
                <li>• Aulas e registros de presença</li>
                <li>• Blocos, exercícios e regras</li>
                <li>• Planos, assinaturas e faturas</li>
                <li>• Logs de auditoria</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Criar Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Restaurar backup: {selectedBackup?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ <strong>Atenção:</strong> A restauração pode sobrescrever dados existentes.
                Recomendamos criar um backup antes de restaurar.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clearExisting">Limpar dados existentes</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove todos os dados antes de restaurar
                  </p>
                </div>
                <Switch
                  id="clearExisting"
                  checked={restoreOptions.clearExisting}
                  onCheckedChange={(checked) => 
                    setRestoreOptions(prev => ({ ...prev, clearExisting: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="skipUsers">Manter usuários atuais</Label>
                  <p className="text-xs text-muted-foreground">
                    Não restaura a tabela de usuários
                  </p>
                </div>
                <Switch
                  id="skipUsers"
                  checked={restoreOptions.skipUsers}
                  onCheckedChange={(checked) => 
                    setRestoreOptions(prev => ({ ...prev, skipUsers: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="skipAuditLogs">Manter logs de auditoria</Label>
                  <p className="text-xs text-muted-foreground">
                    Não restaura os logs (recomendado)
                  </p>
                </div>
                <Switch
                  id="skipAuditLogs"
                  checked={restoreOptions.skipAuditLogs}
                  onCheckedChange={(checked) => 
                    setRestoreOptions(prev => ({ ...prev, skipAuditLogs: checked }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRestore} 
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Deletar Backup
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o backup "{selectedBackup?.id}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O arquivo de backup será permanentemente removido.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Detalhes do Backup
            </DialogTitle>
            <DialogDescription>
              {selectedBackup?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data de Criação</Label>
                  <p className="font-medium">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Criado por</Label>
                  <p className="font-medium">{selectedBackup.createdByName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tamanho</Label>
                  <p className="font-medium">{selectedBackup.sizeFormatted}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Checksum</Label>
                  <p className="font-mono text-sm">{selectedBackup.checksum}</p>
                </div>
              </div>
              
              {selectedBackup.description && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{selectedBackup.description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Contagem de Registros por Tabela</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(selectedBackup.recordCounts).map(([table, count]) => (
                    <div key={table} className="flex justify-between p-2 bg-muted rounded text-sm">
                      <span className="capitalize">{table}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
            {selectedBackup && (
              <Button onClick={() => handleDownload(selectedBackup)}>
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Backup
            </DialogTitle>
            <DialogDescription>
              Importe um arquivo de backup JSON previamente exportado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backupFile">Arquivo de Backup (.json)</Label>
              <Input
                id="backupFile"
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            {importFile && (
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <FileJson className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{importFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(importFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportOpen(false)
              setImportFile(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
