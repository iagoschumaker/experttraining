'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT DETAIL PAGE
// ============================================================================
// Detalhes do cliente com histórico de avaliações e treinos
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Target,
  FileText,
  ClipboardCheck,
  Dumbbell,
  Calendar,
  Pencil,
  Plus,
  MessageCircle,
  Award,
  Ruler,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { ClientEvolution } from '@/components/clients/client-evolution'
import { ClientGoalsForm } from '@/components/clients/client-goals-form'
import { ClientBodyComposition } from '@/components/clients/client-body-composition'

interface Assessment {
  id: string
  status: string
  confidence: number | null
  createdAt: string
  completedAt: string | null
  bodyMetricsJson: Record<string, number> | null
}

interface Workout {
  id: string
  name: string
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  objectives: string | null
  history: string | null
  goal: string | null
  isActive: boolean
  gender: string | null
  createdAt: string
  trainerId: string | null
  goalType: string | null
  goalWeight: number | null
  bodyFat: number | null
  weight: number | null
  height: number | null
  chest: number | null
  waist: number | null
  hip: number | null
  abdomen: number | null
  armRight: number | null
  armLeft: number | null
  forearmRight: number | null
  forearmLeft: number | null
  thighRight: number | null
  thighLeft: number | null
  calfRight: number | null
  calfLeft: number | null
  birthDate: string | null
  sfChest: number | null
  sfAbdomen: number | null
  sfThigh: number | null
  sfTriceps: number | null
  sfSuprailiac: number | null
  sfSubscapular: number | null
  sfMidaxillary: number | null
  trainer?: {
    id: string
    name: string
  } | null
  assessments: Assessment[]
  workouts: Workout[]
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const { user } = useAuth()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMeasureHistory, setShowMeasureHistory] = useState(false)

  // Check permissions
  const isAdmin = user?.role === 'STUDIO_ADMIN'
  const canEdit = isAdmin || (client?.trainerId === user?.id)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    objectives: '',
    history: '',
  })

  // Fetch client
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        const data = await res.json()

        if (data.success) {
          setClient(data.data)
          setFormData({
            name: data.data.name,
            email: data.data.email || '',
            phone: data.data.phone || '',
            objectives: data.data.objectives || '',
            history: data.data.history || '',
          })
        } else {
          alert('Cliente não encontrado')
          router.push('/clients')
        }
      } catch (error) {
        console.error('Error fetching client:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [clientId, router])

  // Update client
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        setClient((prev) => (prev ? { ...prev, ...formData } : null))
        setIsEditOpen(false)
      } else {
        alert(data.error || 'Erro ao atualizar')
      }
    } catch (error) {
      console.error('Error updating:', error)
      alert('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate max-w-[200px] sm:max-w-none">{client.name}</h1>
            <p className="text-sm text-gray-500">
              Cliente desde {formatDate(client.createdAt)}
              {client.trainer && (
                <span className="ml-2">
                  • Personal: <span className="font-medium">{client.trainer.name}</span>
                  {client.trainerId === user?.id && (
                    <Badge variant="outline" className="ml-1 text-xs">Você</Badge>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          <Link href={`/assessments/new?clientId=${client.id}`}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliação
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone || 'Não informado'}</span>
              {client.phone && (
                <a
                  href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto"
                >
                  <Button size="sm" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Award className="h-4 w-4" />
                Meta Principal
              </div>
              <p className="mt-1">
                {client.goal === 'HYPERTROPHY' && 'Hipertrofia'}
                {client.goal === 'STRENGTH' && 'Força'}
                {client.goal === 'CONDITIONING' && 'Condicionamento'}
                {client.goal === 'WEIGHT_LOSS' && 'Emagrecimento'}
                {client.goal === 'REHABILITATION' && 'Reabilitação'}
                {client.goal === 'PERFORMANCE' && 'Performance'}
                {!client.goal && 'Não definida'}
              </p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Objetivos
              </div>
              <p className="mt-1">{client.objectives || 'Não definidos'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Histórico
              </div>
              <p className="mt-1">{client.history || 'Sem histórico registrado'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {client.assessments?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avaliações</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {client.workouts?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Treinos</div>
              </div>
            </div>

            {/* Attendance Stats */}
            {(client as any).attendanceStats && (() => {
              const s = (client as any).attendanceStats
              const pct = Math.round(s.attendanceRate * 100)
              const barColor = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              const statusColor = pct >= 85 ? 'text-green-500' : pct >= 60 ? 'text-yellow-500' : 'text-red-500'
              return (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Presença — {s.workoutName || 'Treino Ativo'}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold text-green-500">{s.sessionsCompleted}</div>
                        <div className="text-[10px] text-muted-foreground">Feitas</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold text-amber-500">{s.remaining}</div>
                        <div className="text-[10px] text-muted-foreground">Faltam</div>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <div className="text-lg font-bold">{s.totalExpected}</div>
                        <div className="text-[10px] text-muted-foreground">Total</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Frequência</span>
                      <span className={`font-bold ${statusColor}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {s.sessionsPerWeek}x/semana • {s.targetWeeks} semanas • Meta: 85%
                    </p>
                  </div>
                </>
              )
            })()}

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Avaliações
          </CardTitle>
          <Link href={`/assessments/new?clientId=${client.id}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Nova
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.assessments && client.assessments.length > 0 ? (
            <div className="space-y-3">
              {client.assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDate(assessment.createdAt)}
                      </span>
                      <Badge
                        variant={
                          assessment.status === 'COMPLETED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {assessment.status === 'COMPLETED'
                          ? 'Concluída'
                          : assessment.status === 'IN_PROGRESS'
                            ? 'Em Andamento'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/assessments/${assessment.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              Nenhuma avaliação realizada
            </p>
          )}
        </CardContent>
      </Card>



      {/* Composição Corporal & Medidas — COMPLETO */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Composição Corporal & Medidas
          </CardTitle>
          {canEdit && (
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" />
                Atualizar
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ========== SEÇÃO 1: DADOS BASE ========== */}
          {(client.weight || client.height || client.bodyFat) && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dados Base</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Peso', val: client.weight, unit: 'kg', color: 'text-blue-400' },
                  { label: 'Altura', val: client.height, unit: 'cm', color: 'text-purple-400' },
                  { label: '% Gordura', val: client.bodyFat, unit: '%', color: 'text-red-400' },
                  { label: 'IMC', val: (client.weight && client.height) ? (Number(client.weight) / Math.pow(Number(client.height) / 100, 2)).toFixed(1) : null, unit: '', color: 'text-amber-400' },
                ].map(({ label, val, unit, color }) => (
                  <div key={label} className="rounded-xl border bg-card p-3 text-center">
                    <div className={`text-lg font-bold ${color}`}>{val ? `${Number(val).toFixed ? Number(val).toFixed(1) : val}${unit}` : '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== SEÇÃO 2: COMPOSIÇÃO CORPORAL GRÁFICO ========== */}
          {client.weight && client.bodyFat && (() => {
            const w = Number(client.weight)
            const bf = Number(client.bodyFat)
            const fatKg = w * bf / 100
            const leanKg = w - fatKg
            const fatPct = bf
            const leanPct = 100 - bf
            const imc = client.height ? w / Math.pow(Number(client.height) / 100, 2) : 0

            // IMC Classification
            const imcZones = [
              { label: 'Abaixo', min: 0, max: 18.5, color: 'bg-blue-500' },
              { label: 'Normal', min: 18.5, max: 24.9, color: 'bg-green-500' },
              { label: 'Sobrepeso', min: 25, max: 29.9, color: 'bg-yellow-500' },
              { label: 'Obeso I', min: 30, max: 34.9, color: 'bg-orange-500' },
              { label: 'Obeso II', min: 35, max: 39.9, color: 'bg-red-500' },
              { label: 'Obeso III', min: 40, max: 60, color: 'bg-red-700' },
            ]
            const currentZone = imcZones.find(z => imc >= z.min && imc <= z.max) || imcZones[5]

            // Body Fat Classification by gender
            const gender = client.gender
            const bfClassification = gender === 'M'
              ? (bf < 6 ? 'Essencial' : bf < 14 ? 'Atleta' : bf < 18 ? 'Bom' : bf < 25 ? 'Normal' : 'Acima')
              : (bf < 14 ? 'Essencial' : bf < 21 ? 'Atleta' : bf < 25 ? 'Bom' : bf < 32 ? 'Normal' : 'Acima')
            const bfColor = gender === 'M'
              ? (bf < 6 ? 'text-blue-400' : bf < 14 ? 'text-green-400' : bf < 18 ? 'text-emerald-400' : bf < 25 ? 'text-yellow-400' : 'text-red-400')
              : (bf < 14 ? 'text-blue-400' : bf < 21 ? 'text-green-400' : bf < 25 ? 'text-emerald-400' : bf < 32 ? 'text-yellow-400' : 'text-red-400')

            // Ideal weight range by IMC 18.5-24.9
            const heightM = client.height ? Number(client.height) / 100 : 0
            const idealMin = heightM > 0 ? (18.5 * heightM * heightM).toFixed(0) : null
            const idealMax = heightM > 0 ? (24.9 * heightM * heightM).toFixed(0) : null

            // RCQ (Relação Cintura-Quadril)
            const rcq = (client.waist && client.hip) ? (Number(client.waist) / Number(client.hip)) : null
            const rcqRisk = rcq ? (gender === 'M' ? (rcq > 0.95 ? 'Alto' : rcq > 0.85 ? 'Moderado' : 'Baixo') : (rcq > 0.85 ? 'Alto' : rcq > 0.75 ? 'Moderado' : 'Baixo')) : null
            const rcqColor = rcqRisk === 'Alto' ? 'text-red-400' : rcqRisk === 'Moderado' ? 'text-yellow-400' : 'text-green-400'

            return (
              <div className="space-y-4">
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Análise Corporal</p>

                {/* Fat vs Lean Mass - Enhanced */}
                <div className="rounded-xl border bg-gradient-to-r from-cyan-500/5 to-red-500/5 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">{leanKg.toFixed(1)}<span className="text-sm">kg</span></div>
                      <div className="text-xs text-muted-foreground">Massa Magra ({leanPct.toFixed(0)}%)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">{fatKg.toFixed(1)}<span className="text-sm">kg</span></div>
                      <div className="text-xs text-muted-foreground">Massa Gorda ({fatPct.toFixed(0)}%)</div>
                    </div>
                  </div>
                  <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner bg-muted/30">
                    <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full transition-all relative" style={{ width: `${leanPct}%` }}>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{leanPct.toFixed(0)}%</span>
                    </div>
                    <div className="bg-gradient-to-r from-red-400 to-red-500 h-full transition-all relative" style={{ width: `${fatPct}%` }}>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{fatPct.toFixed(0)}%</span>
                    </div>
                  </div>
                  {/* Body Fat Classification */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Classificação % Gordura ({gender === 'M' ? 'Masc.' : gender === 'F' ? 'Fem.' : '—'}):</span>
                    <span className={`font-bold ${bfColor}`}>{bfClassification}</span>
                  </div>
                </div>

                {/* IMC Gauge */}
                {imc > 0 && (
                  <div className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Índice de Massa Corporal (IMC)</span>
                      <span className="text-lg font-bold">{imc.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden flex">
                      {imcZones.map(z => (
                        <div key={z.label} className={`${z.color} h-full flex-1 relative`}>
                          {imc >= z.min && imc <= z.max && (
                            <div className="absolute -top-1 w-3 h-5 bg-white border-2 border-foreground rounded-sm"
                              style={{ left: `${((imc - z.min) / (z.max - z.min)) * 100}%`, transform: 'translateX(-50%)' }} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      {imcZones.map(z => <span key={z.label}>{z.label}</span>)}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-muted-foreground">Classificação:</span>
                      <Badge variant="outline" className="text-xs">{currentZone.label}</Badge>
                    </div>
                    {idealMin && idealMax && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Peso ideal (IMC 18.5-24.9):</span>
                        <span className="font-semibold text-green-400">{idealMin}kg — {idealMax}kg</span>
                      </div>
                    )}
                  </div>
                )}

                {/* RCQ */}
                {rcq && (
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">RCQ — Relação Cintura-Quadril</span>
                        <p className="text-xs text-muted-foreground">Cintura {Number(client.waist).toFixed(0)}cm ÷ Quadril {Number(client.hip).toFixed(0)}cm</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{rcq.toFixed(2)}</div>
                        <div className={`text-xs font-semibold ${rcqColor}`}>Risco {rcqRisk}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ========== SEÇÃO 3: DOBRAS CUTÂNEAS (POLLOCK) ========== */}
          {(client.sfChest || client.sfAbdomen || client.sfThigh || client.sfTriceps || client.sfSuprailiac || client.sfSubscapular || client.sfMidaxillary) && (() => {
            const skinfolds = [
              { label: 'Peitoral', val: client.sfChest, icon: '🫁' },
              { label: 'Abdômen', val: client.sfAbdomen, icon: '🔵' },
              { label: 'Coxa', val: client.sfThigh, icon: '🦵' },
              { label: 'Tríceps', val: client.sfTriceps, icon: '💪' },
              { label: 'Suprailíaca', val: client.sfSuprailiac, icon: '🔶' },
              { label: 'Subescapular', val: client.sfSubscapular, icon: '🔷' },
              { label: 'Axilar Médio', val: client.sfMidaxillary, icon: '⬡' },
            ].filter(s => s.val)
            const sumSf = skinfolds.reduce((acc, s) => acc + Number(s.val), 0)
            const maxSf = Math.max(...skinfolds.map(s => Number(s.val)))
            const methodUsed = skinfolds.length >= 7 ? 'Pollock 7 Dobras' : skinfolds.length >= 3 ? 'Pollock 3 Dobras' : 'Parcial'

            return (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dobras Cutâneas (mm)</p>
                  <Badge variant="outline" className="text-xs">{methodUsed}</Badge>
                </div>
                <div className="space-y-2">
                  {skinfolds.map(({ label, val, icon }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-sm w-6">{icon}</span>
                      <span className="text-xs w-28 text-muted-foreground">{label}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                          style={{ width: `${(Number(val) / maxSf) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right">{Number(val).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t">
                  <span className="text-muted-foreground">Soma das dobras</span>
                  <span className="font-bold text-amber-400">{sumSf.toFixed(1)} mm</span>
                </div>
              </div>
            )
          })()}

          {/* ========== SEÇÃO 4: CIRCUNFERÊNCIAS ========== */}
          {(client.chest || client.waist || client.hip || client.abdomen || client.armRight || client.thighRight) && (() => {
            const measurements = [
              { label: 'Peitoral', val: client.chest, color: 'from-blue-400 to-blue-500' },
              { label: 'Cintura', val: client.waist, color: 'from-purple-400 to-purple-500' },
              { label: 'Quadril', val: client.hip, color: 'from-pink-400 to-pink-500' },
              { label: 'Abdômen', val: client.abdomen, color: 'from-indigo-400 to-indigo-500' },
              { label: 'Braço Dir.', val: client.armRight, color: 'from-cyan-400 to-cyan-500' },
              { label: 'Braço Esq.', val: client.armLeft, color: 'from-cyan-400 to-cyan-500' },
              { label: 'Antebraço Dir.', val: client.forearmRight, color: 'from-teal-400 to-teal-500' },
              { label: 'Antebraço Esq.', val: client.forearmLeft, color: 'from-teal-400 to-teal-500' },
              { label: 'Coxa Dir.', val: client.thighRight, color: 'from-emerald-400 to-emerald-500' },
              { label: 'Coxa Esq.', val: client.thighLeft, color: 'from-emerald-400 to-emerald-500' },
              { label: 'Pant. Dir.', val: client.calfRight, color: 'from-green-400 to-green-500' },
              { label: 'Pant. Esq.', val: client.calfLeft, color: 'from-green-400 to-green-500' },
            ].filter(m => m.val)
            const maxVal = Math.max(...measurements.map(m => Number(m.val)))

            return (
              <div className="space-y-3">
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Circunferências (cm)</p>
                <div className="space-y-2">
                  {measurements.map(({ label, val, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs w-28 text-muted-foreground">{label}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                          style={{ width: `${(Number(val) / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-14 text-right">{Number(val).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ========== SEÇÃO 5: HISTÓRICO AVALIAÇÕES ========== */}
          {client.assessments.some(a => a.bodyMetricsJson) && (
            <div>
              <Separator className="my-2" />
              <button
                onClick={() => setShowMeasureHistory(prev => !prev)}
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Histórico de Medidas ({client.assessments.filter(a => a.bodyMetricsJson).length} avaliações)
                </span>
                {showMeasureHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showMeasureHistory && (
                <div className="mt-3 space-y-3">
                  {client.assessments
                    .filter(a => a.bodyMetricsJson)
                    .map(assessment => {
                      const m = assessment.bodyMetricsJson as Record<string, number>
                      return (
                        <div key={assessment.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{formatDate(assessment.createdAt)}</span>
                            <Link href={`/assessments/${assessment.id}`}>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Ver avaliação</Button>
                            </Link>
                          </div>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                            {[
                              { label: 'Peso', key: 'weight', unit: 'kg' },
                              { label: '% Gord.', key: 'bodyFat', unit: '%' },
                              { label: 'Cintura', key: 'waist', unit: 'cm' },
                              { label: 'Peitoral', key: 'chest', unit: 'cm' },
                              { label: 'Braço D', key: 'arm_right', unit: 'cm' },
                              { label: 'Coxa D', key: 'thigh_right', unit: 'cm' },
                            ].map(({ label, key, unit }) => m[key] != null ? (
                              <div key={key} className="text-center bg-muted/30 rounded p-1">
                                <div className="font-semibold">{Number(m[key]).toFixed(1)}{unit === '%' ? '%' : ''}</div>
                                <div className="text-muted-foreground">{label}</div>
                              </div>
                            ) : null)}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {!client.chest && !client.waist && !client.weight && !client.armRight && !client.assessments.some(a => a.bodyMetricsJson) && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Nenhuma medida registrada. <Link href={`/clients/${client.id}/edit`} className="text-amber-500 hover:underline">Adicionar medidas</Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meta do Aluno */}
      {canEdit && (
        <ClientGoalsForm
          clientId={client.id}
          initialGoalType={client.goalType}
          initialGoalWeight={client.goalWeight}
        />
      )}



      {/* Histórico de Check-in */}
      {(client as any).checkInHistory && (client as any).checkInHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Histórico de Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(client as any).checkInHistory.map((lesson: any) => {
                const dateStr = new Date(lesson.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = lesson.startedAt ? new Date(lesson.startedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : ''
                return (
                  <div key={lesson.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <div className="text-sm font-medium capitalize">{dateStr}</div>
                        {timeStr && <div className="text-xs text-muted-foreground">{timeStr}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.focus && (
                        <Badge variant="outline" className="text-xs">{lesson.focus}</Badge>
                      )}
                      {lesson.weekIndex && (
                        <span className="text-xs text-muted-foreground">Sem. {lesson.weekIndex}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Treinos
          </CardTitle>
          <Link href="/workouts/generate">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.workouts && client.workouts.length > 0 ? (
            <div className="space-y-3">
              {client.workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{workout.name}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workout.createdAt)}
                    </p>
                  </div>
                  <Link href={`/workouts/${workout.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              Nenhum treino criado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
