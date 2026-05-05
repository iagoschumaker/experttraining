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
  X,
  Loader2,
  AlertTriangle,
  Clock,
  FileDown,
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { ClientGoalsForm } from '@/components/clients/client-goals-form'
import { BodySilhouette } from '@/components/clients/body-silhouette'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import { generateBodyCompositionPDF } from '@/lib/pdf-generator'
import type { SkinfoldsInput } from '@/services/pollock'

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
  notes: string | null
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
  level?: string
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
  const [fabOpen, setFabOpen] = useState(false)
  const [compareIdxA, setCompareIdxA] = useState(0) // first assessment
  const [compareIdxB, setCompareIdxB] = useState(0) // will be set to last when evals load

  // Manual check-in state
  const [isCheckinOpen, setIsCheckinOpen] = useState(false)
  const [checkinDate, setCheckinDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [checkinTime, setCheckinTime] = useState('08:00')
  const [checkinFocus, setCheckinFocus] = useState('')
  const [savingCheckin, setSavingCheckin] = useState(false)
  // Edit check-in state
  const [editLesson, setEditLesson] = useState<any>(null) // lesson being edited
  const [editFocus, setEditFocus] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [calendarWorkoutFilter, setCalendarWorkoutFilter] = useState<string | null>(null)

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

  // Manual check-in handler
  const handleManualCheckin = async () => {
    if (!checkinDate) return
    setSavingCheckin(true)
    try {
      const res = await fetch(`/api/studio/clients/${clientId}/manual-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: checkinDate,
          time: checkinTime,
          focus: checkinFocus || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsCheckinOpen(false)
        const refresh = await fetch(`/api/clients/${clientId}`)
        const refreshed = await refresh.json()
        if (refreshed.success) setClient(refreshed.data)
      } else {
        alert(data.error || 'Erro ao registrar check-in')
      }
    } catch {
      alert('Erro ao registrar check-in')
    } finally {
      setSavingCheckin(false)
    }
  }

  const handleEditCheckin = async () => {
    if (!editLesson) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/studio/lessons/${editLesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: editFocus || null, date: editDate, time: editTime }),
      })
      const data = await res.json()
      if (data.success) {
        setEditLesson(null)
        const refresh = await fetch(`/api/clients/${clientId}`)
        const refreshed = await refresh.json()
        if (refreshed.success) setClient(refreshed.data)
      } else {
        alert(data.error || 'Erro ao editar check-in')
      }
    } catch {
      alert('Erro ao editar check-in')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteCheckin = async (lessonId: string) => {
    if (!confirm('Excluir este check-in? A sessão será decrementada do treino.')) return
    try {
      const res = await fetch(`/api/studio/lessons/${lessonId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        const refresh = await fetch(`/api/clients/${clientId}`)
        const refreshed = await refresh.json()
        if (refreshed.success) setClient(refreshed.data)
      } else {
        alert(data.error || 'Erro ao excluir check-in')
      }
    } catch {
      alert('Erro ao excluir check-in')
    }
  }

  // PDF body composition handler
  const handleBodyCompositionPDF = async () => {
    if (!client) return
    try {
      // Compute Pollock
      let bf: number | null = null
      const w = client.weight ? Number(client.weight) : null
      const gender = client.gender as 'M' | 'F' | null
      const age = client.birthDate ? ageFromBirthDate(client.birthDate) : null

      if (w && gender && (gender === 'M' || gender === 'F') && client.birthDate) {
        const sfInput: SkinfoldsInput = {
          chest: client.sfChest ? Number(client.sfChest) : undefined,
          abdomen: client.sfAbdomen ? Number(client.sfAbdomen) : undefined,
          thigh: client.sfThigh ? Number(client.sfThigh) : undefined,
          triceps: client.sfTriceps ? Number(client.sfTriceps) : undefined,
          suprailiac: client.sfSuprailiac ? Number(client.sfSuprailiac) : undefined,
          subscapular: client.sfSubscapular ? Number(client.sfSubscapular) : undefined,
          midaxillary: client.sfMidaxillary ? Number(client.sfMidaxillary) : undefined,
        }
        const result = computePollock(sfInput, age!, w, gender)
        if (result) bf = result.bodyFatPercent
      }
      if (bf == null && client.bodyFat) bf = Number(client.bodyFat)

      // Build comparison data if selecting different dates
      let comparisonData = null
      const evals = (client.assessments || []).filter(a => a.bodyMetricsJson).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      if (evals.length >= 1 && compareIdxA !== compareIdxB) {
        const currentData: Record<string, number> = {}
        if (client.weight) currentData.weight = Number(client.weight)
        if (client.bodyFat) currentData.bodyFat = Number(client.bodyFat)
        if (client.chest) currentData.chest = Number(client.chest)
        if (client.waist) currentData.waist = Number(client.waist)
        if (client.hip) currentData.hip = Number(client.hip)
        if (client.abdomen) currentData.abdomen = Number(client.abdomen)
        if (client.armRight) currentData.arm_right = Number(client.armRight)
        if (client.armLeft) currentData.arm_left = Number(client.armLeft)
        if (client.thighRight) currentData.thigh_right = Number(client.thighRight)
        if (client.thighLeft) currentData.thigh_left = Number(client.thighLeft)
        if (client.calfRight) currentData.calf_right = Number(client.calfRight)
        if (client.calfLeft) currentData.calf_left = Number(client.calfLeft)
        if (client.sfTriceps) currentData.sfTriceps = Number(client.sfTriceps)
        if (client.sfSuprailiac) currentData.sfSuprailiac = Number(client.sfSuprailiac)
        if (client.sfThigh) currentData.sfThigh = Number(client.sfThigh)
        if (client.sfChest) currentData.sfChest = Number(client.sfChest)
        if (client.sfAbdomen) currentData.sfAbdomen = Number(client.sfAbdomen)

        const dataA = compareIdxA === -1 ? currentData : (evals[compareIdxA]?.bodyMetricsJson as Record<string, number> ?? {})
        const dataB = compareIdxB === -1 ? currentData : (evals[compareIdxB]?.bodyMetricsJson as Record<string, number> ?? {})
        const labelA = compareIdxA === -1 ? 'Atual' : new Date(evals[compareIdxA]?.createdAt).toLocaleDateString('pt-BR')
        const labelB = compareIdxB === -1 ? 'Atual' : new Date(evals[compareIdxB]?.createdAt).toLocaleDateString('pt-BR')

        comparisonData = { labelA, labelB, dataA, dataB }
      }

      await generateBodyCompositionPDF({
        clientName: client.name,
        gender,
        age,
        weight: w,
        height: client.height ? Number(client.height) : null,
        bodyFat: bf,
        sfChest: client.sfChest ? Number(client.sfChest) : null,
        sfAbdomen: client.sfAbdomen ? Number(client.sfAbdomen) : null,
        sfThigh: client.sfThigh ? Number(client.sfThigh) : null,
        sfTriceps: client.sfTriceps ? Number(client.sfTriceps) : null,
        sfSuprailiac: client.sfSuprailiac ? Number(client.sfSuprailiac) : null,
        sfSubscapular: client.sfSubscapular ? Number(client.sfSubscapular) : null,
        sfMidaxillary: client.sfMidaxillary ? Number(client.sfMidaxillary) : null,
        chest: client.chest ? Number(client.chest) : null,
        waist: client.waist ? Number(client.waist) : null,
        hip: client.hip ? Number(client.hip) : null,
        abdomen: client.abdomen ? Number(client.abdomen) : null,
        armRight: client.armRight ? Number(client.armRight) : null,
        armLeft: client.armLeft ? Number(client.armLeft) : null,
        forearmRight: client.forearmRight ? Number(client.forearmRight) : null,
        forearmLeft: client.forearmLeft ? Number(client.forearmLeft) : null,
        thighRight: client.thighRight ? Number(client.thighRight) : null,
        thighLeft: client.thighLeft ? Number(client.thighLeft) : null,
        calfRight: client.calfRight ? Number(client.calfRight) : null,
        calfLeft: client.calfLeft ? Number(client.calfLeft) : null,
        studioName: undefined,
        studioLogo: undefined,
        studioPhone: undefined,
      }, comparisonData)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF da composição corporal')
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
        {/* Actions moved to floating FAB */}
      </div>

      {/* 61-day reassessment warning */}
      {(() => {
        if (!client.assessments || client.assessments.length === 0) return null
        const lastDate = new Date(client.assessments[0].createdAt)
        const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays < 61) return null
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Reavaliação necessária — {diffDays} dias desde a última avaliação
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A última avaliação foi em {lastDate.toLocaleDateString('pt-BR')}. Recomendamos reavaliar a cada 60 dias.
              </p>
            </div>
            <Link href={`/assessments/new?clientId=${client.id}`}>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs">
                Reavaliar
              </Button>
            </Link>
          </div>
        )
      })()}

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
            {client.notes && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Observações
                  </div>
                  <p className="mt-1">{client.notes}</p>
                </div>
              </>
            )}
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

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nível</span>
              <Badge className={(() => {
                const l = client.level || 'INICIANTE'
                if (l === 'AVANCADO') return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                if (l === 'INTERMEDIARIO') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                return 'bg-green-500/20 text-green-400 border-green-500/30'
              })()}>
                {client.level === 'AVANCADO' ? 'Avançado' :
                 client.level === 'INTERMEDIARIO' ? 'Intermediário' :
                 'Iniciante'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presença & Check-in — Calendário Compacto com CRUD */}
      {(() => {
        const stats = (client as any).attendanceStats
        const allHistory: any[] = (client as any).checkInHistory || []
        const availablePillars: string[] = (client as any).availablePillars || []
        const allWorkouts: any[] = (client as any).workouts || []
        if (!stats && allHistory.length === 0) return null

        // Filter by workout if filter active
        const history = calendarWorkoutFilter
          ? allHistory.filter((l: any) => l.workoutId === calendarWorkoutFilter)
          : allHistory

        const pct = stats ? Math.round(stats.attendanceRate * 100) : 0
        const barColor = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
        const statusText = pct >= 85 ? 'No alvo ✓' : pct >= 60 ? 'Abaixo' : 'Crítico'

        const attendedDates = new Map<string, any>()
        for (const lesson of history) {
          const d = new Date(lesson.date)
          const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
          if (!attendedDates.has(key)) attendedDates.set(key, lesson)
        }

        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth()
        const monthLabel = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const today = new Date()
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        const cells: (number | null)[] = []
        for (let i = 0; i < firstDay; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        while (cells.length % 7 !== 0) cells.push(null)

        const openCheckinFor = (dayNum: number) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          setCheckinDate(dateStr)
          setCheckinFocus('')
          setCheckinTime('08:00')
          setIsCheckinOpen(true)
        }

        const openEditFor = (lesson: any) => {
          const d = new Date(lesson.date)
          const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
          const timeStr = lesson.startedAt
            ? new Date(lesson.startedAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
            : '08:00'
          setEditLesson(lesson)
          setEditDate(dateStr)
          setEditTime(timeStr)
          setEditFocus(lesson.focus || '')
        }

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-green-500" />
                Presença
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Workout filter */}
                {allWorkouts.length > 1 && (
                  <select
                    className="text-[11px] h-7 rounded-md border border-border bg-background px-2 text-muted-foreground"
                    value={calendarWorkoutFilter || ''}
                    onChange={e => setCalendarWorkoutFilter(e.target.value || null)}>
                    <option value="">Todos os treinos</option>
                    {allWorkouts.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name || 'Treino'} {w.isActive ? '(ativo)' : ''}</option>
                    ))}
                  </select>
                )}
                <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2"
                      onClick={() => { setCheckinDate(todayKey); setCheckinFocus(''); setCheckinTime('08:00') }}>
                      <Plus className="h-3 w-3" />
                      Check-in
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Registrar Check-in</DialogTitle>
                      <DialogDescription className="text-xs">Presença para {client.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Data</Label>
                          <Input type="date" value={checkinDate}
                            onChange={(e) => setCheckinDate(e.target.value)}
                            max={todayKey} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Horário</Label>
                          <Input type="time" value={checkinTime}
                            onChange={(e) => setCheckinTime(e.target.value)} className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Treino do dia (opcional)</Label>
                        {availablePillars.length > 0 ? (
                          <select
                            className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={checkinFocus}
                            onChange={e => setCheckinFocus(e.target.value)}>
                            <option value="">— Não informar —</option>
                            {availablePillars.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <Input placeholder="Ex: PERNA, EMPURRA, PUXA..." value={checkinFocus}
                            onChange={(e) => setCheckinFocus(e.target.value)} className="h-8 text-xs" />
                        )}
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsCheckinOpen(false)}>Cancelar</Button>
                      <Button size="sm" onClick={handleManualCheckin} disabled={savingCheckin || !checkinDate}>
                        {savingCheckin && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Registrar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Stats compact */}
              {stats && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Feitas', val: stats.sessionsCompleted, color: 'text-green-400' },
                      { label: 'Restam', val: stats.remaining, color: 'text-amber-400' },
                      { label: '/semana', val: `${stats.sessionsPerWeek}x`, color: 'text-blue-400' },
                      { label: 'Freq.', val: `${pct}%`, color: pct >= 85 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400' },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg border p-2 text-center">
                        <div className={`text-lg font-bold leading-none ${s.color}`}>{s.val}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{stats.sessionsCompleted}/{stats.totalExpected} sessões</span>
                    <span className={pct >= 85 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}>{statusText}</span>
                  </div>
                  {stats.workoutId && (
                    <Link href={`/workouts/${stats.workoutId}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-7">
                        Ver treino ativo{stats.workoutName ? `: ${stats.workoutName}` : ''}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              <Separator />

              {/* Compact Calendar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground text-[10px]"
                    onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>◀</button>
                  <p className="text-[11px] font-semibold capitalize">{monthLabel}</p>
                  <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground text-[10px]"
                    onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                    disabled={year >= today.getFullYear() && month >= today.getMonth()}>▶</button>
                </div>

                <div className="grid grid-cols-7 gap-px">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[9px] font-semibold text-muted-foreground pb-0.5">{d}</div>
                  ))}
                  {cells.map((day, idx) => {
                    if (day === null) return <div key={`e-${idx}`} />
                    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const lesson = attendedDates.get(dateKey)
                    const isToday = dateKey === todayKey
                    const isFuture = dateKey > todayKey
                    const phaseLabel = lesson?.workoutName ? ` · ${lesson.workoutName}` : ''
                    return (
                      <button key={dateKey}
                        onClick={() => lesson ? openEditFor(lesson) : !isFuture && openCheckinFor(day)}
                        disabled={isFuture}
                        title={lesson
                          ? `✓ ${lesson.focus || 'Treino'}${phaseLabel} — clique para editar`
                          : isFuture ? '' : `Registrar ${day}/${month + 1}`}
                        className={`relative aspect-square flex flex-col items-center justify-center rounded text-[10px] font-medium transition-all
                          ${lesson ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 cursor-pointer'
                            : isFuture ? 'text-muted-foreground/20 cursor-default'
                            : isToday ? 'border border-amber-400 text-amber-400 hover:bg-amber-500/10 cursor-pointer'
                            : 'text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground cursor-pointer'}`}>
                        {lesson && <span className="text-[7px] text-green-500 leading-none">✓</span>}
                        <span className="leading-none">{day}</span>
                      </button>
                    )
                  })}
                </div>

                <p className="text-[9px] text-muted-foreground text-center mt-1">
                  🟢 Presente · Passe o mouse para ver nível/fase · Clique para editar
                </p>
              </div>

              {/* Phase/Level summary — sessions per workout across full history */}
              {allHistory.length > 0 && (() => {
                const byWorkout = new Map<string, { name: string; count: number; isActive: boolean }>()
                for (const l of allHistory) {
                  const wid = l.workoutId || '__none__'
                  const name = l.workoutName || 'Treino'
                  if (!byWorkout.has(wid)) {
                    const isActive = allWorkouts.find((w: any) => w.id === wid)?.isActive || false
                    byWorkout.set(wid, { name, count: 0, isActive })
                  }
                  byWorkout.get(wid)!.count++
                }
                const sorted = Array.from(byWorkout.values()).sort((a, b) => b.count - a.count)
                return (
                  <div className="mt-3">
                    <Separator className="mb-2" />
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">📊 Sessões por Fase/Nível</p>
                    <div className="space-y-1">
                      {sorted.map((row, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            {row.isActive && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" />}
                            <span className="text-[10px] text-foreground truncate">{row.name}</span>
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{row.count} sess.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </CardContent>

            {/* Edit lesson modal */}
            <Dialog open={!!editLesson} onOpenChange={(o) => !o && setEditLesson(null)}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">Editar Check-in</DialogTitle>
                  <DialogDescription className="text-xs space-y-0.5">
                    <div>
                      {editLesson?.focus && <span className="font-medium text-foreground">{editLesson.focus} · </span>}
                      {editDate && new Date(editDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </div>
                    {editLesson?.workoutName && (
                      <div className="text-[10px] text-muted-foreground/70">📋 {editLesson.workoutName}</div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data</Label>
                      <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        max={todayKey} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horário</Label>
                      <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Treino</Label>
                    {availablePillars.length > 0 ? (
                      <select className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                        value={editFocus} onChange={e => setEditFocus(e.target.value)}>
                        <option value="">— Não informar —</option>
                        {availablePillars.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <Input placeholder="Ex: PERNA, EMPURRA..." value={editFocus}
                        onChange={e => setEditFocus(e.target.value)} className="h-8 text-xs" />
                    )}
                  </div>
                </div>
                <DialogFooter className="gap-2 flex-row justify-between">
                  <Button variant="destructive" size="sm" className="text-xs"
                    onClick={() => { handleDeleteCheckin(editLesson.id); setEditLesson(null) }}>
                    🗑 Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditLesson(null)}>Cancelar</Button>
                    <Button size="sm" onClick={handleEditCheckin} disabled={savingEdit}>
                      {savingEdit && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        )
      })()}



      {/* Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Avaliações
          </CardTitle>
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



      {/* Composição Corporal — Pollock & Comparação */}
      <Card id="body-composition-section">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Composição Corporal & Medidas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBodyCompositionPDF}
              title="Exportar PDF"
            >
              <FileDown className="mr-1 h-4 w-4 text-amber-500" />
              PDF
            </Button>
            {canEdit && (
              <Link href={`/clients/${client.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-1 h-4 w-4" />
                  Atualizar
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* ========== POLLOCK: PIE CHART + DADOS ========== */}
          {(() => {
            // Compute Pollock client-side from skinfold data
            const w = client.weight ? Number(client.weight) : null
            const gender = client.gender as 'M' | 'F' | null
            const birthDate = client.birthDate

            let bf: number | null = null

            if (w && gender && (gender === 'M' || gender === 'F') && birthDate) {
              const sfInput: SkinfoldsInput = {
                chest: client.sfChest ? Number(client.sfChest) : undefined,
                abdomen: client.sfAbdomen ? Number(client.sfAbdomen) : undefined,
                thigh: client.sfThigh ? Number(client.sfThigh) : undefined,
                triceps: client.sfTriceps ? Number(client.sfTriceps) : undefined,
                suprailiac: client.sfSuprailiac ? Number(client.sfSuprailiac) : undefined,
                subscapular: client.sfSubscapular ? Number(client.sfSubscapular) : undefined,
                midaxillary: client.sfMidaxillary ? Number(client.sfMidaxillary) : undefined,
              }
              const age = ageFromBirthDate(birthDate)
              const result = computePollock(sfInput, age, w, gender)
              if (result) bf = result.bodyFatPercent
            }

            // Fall back to saved bodyFat if Pollock can't compute
            if (bf == null && client.bodyFat) bf = Number(client.bodyFat)

            // Show helpful message when data is incomplete
            if (!w || bf == null) {
              const missing: string[] = []
              if (!w) missing.push('Peso')
              if (!gender || (gender !== 'M' && gender !== 'F')) missing.push('Sexo')
              if (!birthDate) missing.push('Data de Nascimento')
              if (gender === 'F' && (!client.sfTriceps || !client.sfSuprailiac || !client.sfThigh))
                missing.push('Dobras: Tríceps, Suprailíaca, Coxa')
              if (gender === 'M' && (!client.sfChest || !client.sfAbdomen || !client.sfThigh))
                missing.push('Dobras: Peitoral, Abdômen, Coxa')
              if (bf == null && !missing.some(m => m.startsWith('Dobras')))
                missing.push(gender === 'F' ? 'Dobras: Tríceps, Suprailíaca, Coxa' : 'Dobras: Peitoral, Abdômen, Coxa')

              return (
                <div className="rounded-lg border border-amber-500/50 p-3 text-xs space-y-1 bg-amber-500/5">
                  <p className="font-semibold text-amber-600">⚠️ Para calcular a Análise Pollock, preencha:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {missing.map(m => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )
            }

            const fatKg = w * bf / 100
            const leanKg = w - fatKg
            const leanPct = 100 - bf
            const bfClass = gender === 'M'
              ? (bf < 6 ? 'Essencial' : bf < 14 ? 'Atleta' : bf < 18 ? 'Bom' : bf < 25 ? 'Normal' : 'Acima')
              : (bf < 14 ? 'Essencial' : bf < 21 ? 'Atleta' : bf < 25 ? 'Bom' : bf < 32 ? 'Normal' : 'Acima')
            const bfColor = gender === 'M'
              ? (bf < 6 ? 'text-blue-400' : bf < 14 ? 'text-green-400' : bf < 18 ? 'text-emerald-400' : bf < 25 ? 'text-yellow-400' : 'text-red-400')
              : (bf < 14 ? 'text-blue-400' : bf < 21 ? 'text-green-400' : bf < 25 ? 'text-emerald-400' : bf < 32 ? 'text-yellow-400' : 'text-red-400')

            return (
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Análise Pollock — {gender === 'M' ? '3 Dobras Masculino' : '3 Dobras Feminino'}</p>

                {/* Pie Chart + Data Grid */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* CSS Pie Chart */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-36 h-36 rounded-full shadow-lg"
                      style={{
                        background: `conic-gradient(
                          #22d3ee 0% ${leanPct}%,
                          #f87171 ${leanPct}% 100%
                        )`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-background flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{bf.toFixed(1)}%</span>
                        <span className="text-[10px] text-muted-foreground">Gordura</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Cards */}
                  <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    <div className="rounded-xl border p-3 text-center">
                      <div className="text-xl font-bold text-blue-400">{w.toFixed(1)}<span className="text-xs">kg</span></div>
                      <div className="text-xs text-muted-foreground">Peso</div>
                    </div>
                    <div className="rounded-xl border p-3 text-center">
                      <div className="text-xl font-bold text-purple-400">{client.height ? Number(client.height).toFixed(0) : '—'}<span className="text-xs">cm</span></div>
                      <div className="text-xs text-muted-foreground">Altura</div>
                    </div>
                    <div className="rounded-xl border p-3 text-center bg-cyan-500/5">
                      <div className="text-xl font-bold text-cyan-400">{leanKg.toFixed(1)}<span className="text-xs">kg</span></div>
                      <div className="text-xs text-muted-foreground">Massa Magra ({leanPct.toFixed(0)}%)</div>
                    </div>
                    <div className="rounded-xl border p-3 text-center bg-red-500/5">
                      <div className="text-xl font-bold text-red-400">{fatKg.toFixed(1)}<span className="text-xs">kg</span></div>
                      <div className="text-xs text-muted-foreground">Massa Gorda ({bf.toFixed(0)}%)</div>
                    </div>
                  </div>
                </div>

                {/* Massa Magra vs Gorda — Bar */}
                <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner bg-muted/30">
                  <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full transition-all relative" style={{ width: `${leanPct}%` }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">Magra {leanPct.toFixed(0)}%</span>
                  </div>
                  <div className="bg-gradient-to-r from-red-400 to-red-500 h-full transition-all relative" style={{ width: `${bf}%` }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">Gorda {bf.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Classification */}
                <div className="flex items-center justify-between text-xs rounded-lg border p-2">
                  <span className="text-muted-foreground">Classificação ({gender === 'M' ? 'Masculino' : gender === 'F' ? 'Feminino' : '—'}):</span>
                  <span className={`font-bold text-sm ${bfColor}`}>{bfClass}</span>
                </div>
              </div>
            )
          })()}

          {/* ========== DOBRAS CUTÂNEAS (POLLOCK) ========== */}
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
            const method = skinfolds.length >= 7 ? 'Pollock 7 Dobras' : skinfolds.length >= 3 ? 'Pollock 3 Dobras' : 'Parcial'
            return (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dobras Cutâneas (mm)</p>
                  <Badge variant="outline" className="text-xs">{method}</Badge>
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

          {/* ========== CIRCUNFERÊNCIAS ========== */}
          {(client.chest || client.waist || client.hip || client.abdomen || client.armRight || client.thighRight) && (() => {
            const measurements = [
              { label: 'Peitoral', val: client.chest, color: 'from-blue-400 to-blue-500' },
              { label: 'Cintura', val: client.waist, color: 'from-purple-400 to-purple-500' },
              { label: 'Quadril', val: client.hip, color: 'from-pink-400 to-pink-500' },
              { label: 'Abdômen', val: client.abdomen, color: 'from-indigo-400 to-indigo-500' },
              { label: 'Braço Dir.', val: client.armRight, color: 'from-cyan-400 to-cyan-500' },
              { label: 'Braço Esq.', val: client.armLeft, color: 'from-cyan-400 to-cyan-500' },
              { label: 'Anteb. Dir.', val: client.forearmRight, color: 'from-teal-400 to-teal-500' },
              { label: 'Anteb. Esq.', val: client.forearmLeft, color: 'from-teal-400 to-teal-500' },
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
                {/* Layout lado a lado: barras + silhueta */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Barras */}
                  <div className="space-y-2">
                    {measurements.map(({ label, val, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs w-24 text-muted-foreground">{label}</span>
                        <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                            style={{ width: `${(Number(val) / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-14 text-right">{Number(val).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                  {/* SVG Silhueta */}
                  <BodySilhouette
                    gender={client.gender as 'M' | 'F' | null}
                    bodyFat={client.bodyFat}
                    chest={client.chest}
                    waist={client.waist}
                    hip={client.hip}
                    abdomen={client.abdomen}
                    armRight={client.armRight}
                    armLeft={client.armLeft}
                    forearmRight={client.forearmRight}
                    forearmLeft={client.forearmLeft}
                    thighRight={client.thighRight}
                    thighLeft={client.thighLeft}
                    calfRight={client.calfRight}
                    calfLeft={client.calfLeft}
                    sfChest={client.sfChest}
                    sfAbdomen={client.sfAbdomen}
                    sfThigh={client.sfThigh}
                    sfTriceps={client.sfTriceps}
                    sfSuprailiac={client.sfSuprailiac}
                    sfSubscapular={client.sfSubscapular}
                    sfMidaxillary={client.sfMidaxillary}
                  />
                </div>
              </div>
            )
          })()}

          {/* ========== COMPARAÇÃO DE AVALIAÇÕES ========== */}
          {(client.assessments || []).filter(a => a.bodyMetricsJson).length >= 2 && (() => {
            const evals = (client.assessments || []).filter(a => a.bodyMetricsJson).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            // Data always from assessments (not client-level fields anymore)
            const idxA = compareIdxA >= 0 && compareIdxA < evals.length ? compareIdxA : 0
            const idxB = compareIdxB >= 0 && compareIdxB < evals.length ? compareIdxB : evals.length - 1

            const flattenMetrics = (bm: any) => {
              if (!bm) return {}
              return {
                weight: bm.weight,
                bodyFat: bm.bodyFat,
                chest: bm.measurements?.chest,
                waist: bm.measurements?.waist,
                hip: bm.measurements?.hip,
                abdomen: bm.measurements?.abdomen,
                armRight: bm.measurements?.arm_right,
                armLeft: bm.measurements?.arm_left,
                forearmRight: bm.measurements?.forearm_right,
                forearmLeft: bm.measurements?.forearm_left,
                thighRight: bm.measurements?.thigh_right,
                thighLeft: bm.measurements?.thigh_left,
                calfRight: bm.measurements?.calf_right,
                calfLeft: bm.measurements?.calf_left,
                sfChest: bm.skinfolds?.chest,
                sfAbdomen: bm.skinfolds?.abdomen,
                sfThigh: bm.skinfolds?.thigh,
                sfTriceps: bm.skinfolds?.triceps,
                sfSuprailiac: bm.skinfolds?.suprailiac,
                sfSubscapular: bm.skinfolds?.subscapular,
                sfMidaxillary: bm.skinfolds?.midaxillary,
              }
            }

            const dataA = flattenMetrics(evals[idxA]?.bodyMetricsJson)
            const dataB = flattenMetrics(evals[idxB]?.bodyMetricsJson)
            const labelA = new Date(evals[idxA]?.createdAt).toLocaleDateString('pt-BR')
            const labelB = new Date(evals[idxB]?.createdAt).toLocaleDateString('pt-BR')

            const metrics = [
              { label: 'Peso', key: 'weight', unit: 'kg', lowerBetter: false },
              { label: '% Gordura', key: 'bodyFat', unit: '%', lowerBetter: true },
              { label: 'Peitoral', key: 'chest', unit: 'cm', lowerBetter: false },
              { label: 'Cintura', key: 'waist', unit: 'cm', lowerBetter: true },
              { label: 'Quadril', key: 'hip', unit: 'cm', lowerBetter: false },
              { label: 'Abdômen', key: 'abdomen', unit: 'cm', lowerBetter: true },
              { label: 'Braço D', key: 'armRight', unit: 'cm', lowerBetter: false },
              { label: 'Braço E', key: 'armLeft', unit: 'cm', lowerBetter: false },
              { label: 'Coxa D', key: 'thighRight', unit: 'cm', lowerBetter: false },
              { label: 'Coxa E', key: 'thighLeft', unit: 'cm', lowerBetter: false },
              { label: 'Pant. D', key: 'calfRight', unit: 'cm', lowerBetter: false },
              { label: 'Pant. E', key: 'calfLeft', unit: 'cm', lowerBetter: false },
              { label: 'Tríceps', key: 'sfTriceps', unit: 'mm', lowerBetter: true },
              { label: 'Suprail.', key: 'sfSuprailiac', unit: 'mm', lowerBetter: true },
              { label: 'Coxa DC', key: 'sfThigh', unit: 'mm', lowerBetter: true },
            ]

            // Filter to only metrics that have data in at least one side
            const activeMetrics = metrics.filter(m => dataA[m.key] != null || dataB[m.key] != null)
            const maxVals = activeMetrics.map(m => Math.max(dataA[m.key] ?? 0, dataB[m.key] ?? 0))
            const globalMax = Math.max(...maxVals, 1)

            return (
              <div className="space-y-3">
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">📊 Comparação de Avaliações</p>

                {/* Dual Date Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Data A</label>
                    <select
                      className="w-full text-xs rounded-md border bg-background px-2 py-1.5"
                      value={compareIdxA}
                      onChange={(e) => setCompareIdxA(Number(e.target.value))}
                    >
                      {evals.map((ev, i) => (
                        <option key={ev.id} value={i}>
                          {new Date(ev.createdAt).toLocaleDateString('pt-BR')} {i === 0 ? '(1ª)' : i === evals.length - 1 ? '(última)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Data B</label>
                    <select
                      className="w-full text-xs rounded-md border bg-background px-2 py-1.5"
                      value={compareIdxB}
                      onChange={(e) => setCompareIdxB(Number(e.target.value))}
                    >
                      {evals.map((ev, i) => (
                        <option key={ev.id} value={i}>
                          {new Date(ev.createdAt).toLocaleDateString('pt-BR')} {i === 0 ? '(1ª)' : i === evals.length - 1 ? '(última)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3D Body Evolution Comparison */}
                <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4 bg-muted/50 px-3 py-1.5 rounded-full z-10 shadow-sm border border-border/50">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-foreground">{labelA}</span>
                    </div>
                    <div className="scale-75 origin-top -mb-[25%] w-full">
                      <BodySilhouette gender={client.gender} {...dataA} compact={true} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-4 bg-muted/50 px-3 py-1.5 rounded-full z-10 shadow-sm border border-border/50">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-foreground">{labelB}</span>
                    </div>
                    <div className="scale-75 origin-top -mb-[25%] w-full">
                      <BodySilhouette gender={client.gender} {...dataB} compact={true} />
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-500 to-blue-400" />
                    <span className="text-muted-foreground">{labelA}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-amber-500 to-amber-400" />
                    <span className="text-muted-foreground">{labelB}</span>
                  </div>
                </div>

                {/* Vertical Bar Chart */}
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 min-w-0" style={{ minHeight: '180px' }}>
                    {activeMetrics.map((m, idx) => {
                      const valA = dataA[m.key] ?? 0
                      const valB = dataB[m.key] ?? 0
                      const localMax = Math.max(valA, valB, 0.1)
                      const delta = valB - valA
                      const isGood = m.lowerBetter ? delta <= 0 : delta >= 0
                      const hA = valA > 0 ? Math.max(8, (valA / localMax) * 140) : 0
                      const hB = valB > 0 ? Math.max(8, (valB / localMax) * 140) : 0

                      return (
                        <div key={m.key} className="flex flex-col items-center flex-1 min-w-[40px] max-w-[60px]">
                          {/* Delta */}
                          {delta !== 0 && valA > 0 && valB > 0 && (
                            <span className={`text-[9px] font-bold mb-1 ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </span>
                          )}
                          {/* Bars container */}
                          <div className="flex items-end gap-[2px] w-full justify-center" style={{ height: '140px' }}>
                            {/* Bar A */}
                            <div className="flex flex-col items-center w-[14px]">
                              <div
                                className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                                style={{ height: `${hA}px` }}
                              />
                            </div>
                            {/* Bar B */}
                            <div className="flex flex-col items-center w-[14px]">
                              <div
                                className="w-full rounded-t-sm bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-500"
                                style={{ height: `${hB}px` }}
                              />
                            </div>
                          </div>
                          {/* Values */}
                          <div className="text-[8px] text-center mt-1 leading-tight">
                            <span className="text-blue-400 font-bold">{valA > 0 ? valA.toFixed(1) : '—'}</span>
                            <span className="text-muted-foreground mx-[1px]">/</span>
                            <span className="text-amber-400 font-bold">{valB > 0 ? valB.toFixed(1) : '—'}</span>
                          </div>
                          {/* Label */}
                          <span className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight">{m.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Summary Table */}
                {activeMetrics.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left px-2 py-1 font-medium text-muted-foreground">Medida</th>
                          <th className="text-right px-2 py-1 font-medium text-blue-400">{labelA}</th>
                          <th className="text-right px-2 py-1 font-medium text-amber-400">{labelB}</th>
                          <th className="text-right px-2 py-1 font-medium text-muted-foreground">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetrics.map(m => {
                          const vA = dataA[m.key]
                          const vB = dataB[m.key]
                          const delta = (vB ?? 0) - (vA ?? 0)
                          const isGood = m.lowerBetter ? delta <= 0 : delta >= 0
                          return (
                            <tr key={m.key} className="border-t border-muted/20">
                              <td className="px-2 py-1 text-muted-foreground">{m.label}</td>
                              <td className="px-2 py-1 text-right font-medium">{vA != null ? vA.toFixed(1) : '—'} <span className="text-muted-foreground">{m.unit}</span></td>
                              <td className="px-2 py-1 text-right font-medium">{vB != null ? vB.toFixed(1) : '—'} <span className="text-muted-foreground">{m.unit}</span></td>
                              <td className={`px-2 py-1 text-right font-bold ${vA != null && vB != null && delta !== 0 ? (isGood ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground'}`}>
                                {vA != null && vB != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

          {!(client.assessments || []).some(a => a.bodyMetricsJson) && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Nenhuma medida registrada. <Link href={`/assessments/new?clientId=${client.id}`} className="text-amber-500 hover:underline">Criar avaliação</Link>
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
      {/* Floating Action Button (FAB) — expandable */}
      {fabOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            {canEdit && (
              <Link href={`/clients/${client.id}/edit`} onClick={() => setFabOpen(false)}>
                <Button className="rounded-full shadow-lg px-5 h-11 bg-card border border-border text-foreground hover:bg-muted gap-2">
                  <Pencil className="w-4 h-4" />
                  Editar Aluno
                </Button>
              </Link>
            )}
            <Link href={`/assessments/new?clientId=${client.id}`} onClick={() => setFabOpen(false)}>
              <Button className="rounded-full shadow-lg px-5 h-11 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Nova Avaliação
              </Button>
            </Link>
          </>
        )}
        <Button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl transition-all ${fabOpen
            ? 'bg-muted hover:bg-muted/80 text-foreground rotate-45'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black'
            }`}
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  )
}
