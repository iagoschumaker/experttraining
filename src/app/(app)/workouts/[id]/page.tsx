// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL PAGE
// ============================================================================
// Visualização completa do treino - Compartilhado entre Studio e Personal
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Activity,
  User,
  FileText,
  Edit,
  Archive,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Download,
} from 'lucide-react'
import Link from 'next/link'

interface Block {
  id: string
  code: string
  name: string
  category: string
  description: string
  weeklyFrequency: number
}

interface Workout {
  id: string
  status: string
  weeklyFrequency: number
  phaseDuration: number
  notes: string | null
  createdAt: string
  blocksUsed: string[]
  scheduleJson: any
  client: {
    id: string
    name: string
    email: string
    status: string
  }
  creator: {
    name: string
  }
  assessment: {
    id: string
    resultJson: any
    confidence: number
  } | null
  blocks: Block[]
  studio?: {
    name: string
    logoUrl: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
}

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  async function loadWorkout() {
    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`)
      const data = await res.json()

      if (data.success) {
        setWorkout(data.data)
      } else {
        setError('Treino não encontrado')
      }
    } catch (err) {
      console.error('Error loading workout:', err)
      setError('Erro ao carregar treino')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!workout) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (data.success) {
        setWorkout({ ...workout, status: newStatus })
      } else {
        alert(data.error || 'Erro ao atualizar status')
      }
    } catch (err) {
      console.error('Update error:', err)
      alert('Erro de conexão')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este treino?')) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        router.push('/workouts')
      } else {
        alert(data.error || 'Erro ao excluir treino')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Erro de conexão')
    } finally {
      setUpdating(false)
    }
  }

  // ========================================================================
  // FUNÇÃO DE DOWNLOAD PDF - ULTRA COMPACTO (4 SEMANAS EM 1 PÁGINA A4)
  // ========================================================================
  async function handleDownloadPDF() {
    if (!workout || !schedule) return

    const freq = workout.weeklyFrequency || 3
    const studioName = workout.studio?.name || 'Studio'
    const studioLogo = workout.studio?.logoUrl || ''
    const studioPhone = workout.studio?.phone || ''
    const studioEmail = workout.studio?.email || ''

    // Converter logo para base64 (necessário para Puppeteer)
    let logoBase64 = ''
    if (studioLogo) {
      try {
        const response = await fetch(studioLogo)
        const blob = await response.blob()
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.error('Erro ao converter logo:', e)
      }
    }

    // Gerar linha de exercício (igual ao desktop)
    const exRow = (ex: any) => {
      const label = ex.role === 'FOCO_PRINCIPAL' ? 'F' : ex.role === 'PUSH_PULL_INTEGRADO' ? 'P' : 'C'
      const cls = ex.role === 'FOCO_PRINCIPAL' ? 'ex-f' : ex.role === 'PUSH_PULL_INTEGRADO' ? 'ex-p' : 'ex-c'
      return `<div class="ex-row">
        <span class="ex-badge ${cls}">${label}</span>
        <span class="ex-name">${ex.name}</span>
        <span class="ex-info">${ex.sets}×${ex.reps} <em>${ex.rest || ''}</em></span>
      </div>`
    }

    // Gerar preparação (estilo desktop)
    const genPrep = (prep: any) => {
      if (!prep?.exercises || prep.exercises.length === 0) return ''
      return `
        <div class="prep-card">
          <div class="prep-header">
            <span>Preparação</span>
            <span class="time">${prep.totalTime || '12 min'}</span>
          </div>
          <div class="prep-content">
            ${prep.exercises.slice(0, 4).map((ex: any) => 
              `<div class="prep-item">
                <span>${ex.name}</span>
                <span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      `
    }

    // Gerar bloco (estilo desktop)
    const genBlock = (b: any, idx: number) => `
      <div class="block-card">
        <div class="block-header">
          <span>${b.name || `Bloco ${idx + 1}`}</span>
          <span class="time">${b.restAfterBlock || ''}</span>
        </div>
        <div class="block-content">
          ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
        </div>
      </div>
    `

    // Gerar protocolo (estilo desktop)
    const genProtocol = (protocol: any) => {
      if (!protocol) return ''
      return `
        <div class="prot-card">
          <div class="prot-header">
            <span>${protocol.name || 'Protocolo'}</span>
            <span class="time">${protocol.totalTime || '6 min'}</span>
          </div>
          ${protocol.structure ? `<div class="prot-structure">${protocol.structure}</div>` : ''}
        </div>
      `
    }

    // Gerar sessão/dia (card igual desktop)
    const genSession = (s: any) => `
      <div class="day-card">
        <div class="day-header">
          <div class="day-badge">${s.session}</div>
          <span class="day-title">Dia ${s.session}</span>
          <span class="day-duration">${s.estimatedDuration || 60} min</span>
        </div>
        <div class="day-content">
          ${genPrep(s.preparation)}
          <div class="blocks-label">Blocos</div>
          ${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}
          ${genProtocol(s.finalProtocol)}
        </div>
      </div>
    `

    // Gerar semana (layout grid 3 colunas)
    const genWeek = (w: any) => `
      <section class="week-section">
        <div class="week-header">
          <div class="week-badge">${w.week}</div>
          <div class="week-info">
            <h2>Semana ${w.week}</h2>
            ${w.phaseLabel ? `<span class="phase-label">Fase: ${w.phaseLabel}</span>` : ''}
          </div>
        </div>
        <div class="days-grid">
          ${w.sessions.map((s: any) => genSession(s)).join('')}
        </div>
      </section>
    `
    
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:6mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:6.5pt;color:#1a1a1a;line-height:1.15;background:#fff;transform:scale(0.82);transform-origin:top center}

/* HEADER */
.page-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:1.5mm;margin-bottom:2mm;border-bottom:1.5px solid #f59e0b}
.header-left{display:flex;align-items:center;gap:2mm}
.header-left img{height:10mm;max-width:25mm;object-fit:contain}
.header-info h1{font-size:9pt;font-weight:700;color:#1a1a1a;margin-bottom:0.3mm}
.header-info p{font-size:6.5pt;color:#666;margin:0;line-height:1.15}
.header-right{text-align:right;font-size:6.5pt;color:#666}
.header-right strong{color:#1a1a1a}

/* WEEK SECTION */
.week-section{margin-bottom:3mm}
.week-header{display:flex;align-items:center;gap:1.5mm;padding-bottom:1mm;margin-bottom:1.5mm;border-bottom:1px solid #e5e5e5}
.week-badge{width:7mm;height:7mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:8pt;display:flex;align-items:center;justify-content:center;border-radius:1.2mm}
.week-info h2{font-size:8pt;font-weight:600;color:#1a1a1a;margin:0}
.phase-label{font-size:5.5pt;color:#888}

/* DAYS GRID - 3 colunas */
.days-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5mm}

/* DAY CARD */
.day-card{border:1px solid #e5e5e5;border-radius:1.2mm;overflow:hidden;break-inside:avoid}
.day-header{background:linear-gradient(135deg,#fef3c7,#fef9c3);padding:1.2mm;display:flex;align-items:center;gap:1.2mm;border-bottom:1px solid #fcd34d}
.day-badge{width:4.5mm;height:4.5mm;background:#f59e0b;color:#fff;font-weight:700;font-size:6.5pt;display:flex;align-items:center;justify-content:center;border-radius:0.7mm}
.day-title{font-weight:600;font-size:6.5pt;flex:1}
.day-duration{font-size:4.5pt;color:#92400e;font-family:monospace}
.day-content{padding:1.2mm}

/* PREP CARD */
.prep-card{background:#fffbeb;border:1px solid #fcd34d;border-radius:0.8mm;padding:0.8mm;margin-bottom:1.2mm}
.prep-header{display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#b45309;margin-bottom:0.4mm}
.prep-header .time{font-family:monospace;font-weight:400}
.prep-content{font-size:4.5pt;color:#78716c}
.prep-item{display:flex;justify-content:space-between;padding:0.15mm 0}

/* BLOCKS */
.blocks-label{font-size:4.5pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.2px;margin:0.8mm 0 0.4mm}
.block-card{background:#eff6ff;border:1px solid #93c5fd;border-radius:0.8mm;padding:0.8mm;margin-bottom:0.8mm}
.block-header{display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#1e40af;margin-bottom:0.4mm}
.block-header .time{font-family:monospace;font-weight:400;color:#3b82f6}
.block-content{background:#fff;border-radius:0.6mm;overflow:hidden}

/* EXERCISE ROW */
.ex-row{display:flex;align-items:center;padding:0.6mm;border-bottom:1px solid #e0f2fe;font-size:5.5pt}
.ex-row:last-child{border-bottom:none}
.ex-badge{width:3mm;height:3mm;font-size:3.5pt;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:0.5mm;margin-right:0.8mm;flex-shrink:0}
.ex-f{background:#ffedd5;color:#c2410c}
.ex-p{background:#f3e8ff;color:#7c3aed}
.ex-c{background:#dcfce7;color:#15803d}
.ex-name{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-info{font-size:4.5pt;color:#6b7280;margin-left:0.6mm;white-space:nowrap}
.ex-info em{color:#f59e0b;font-style:normal;margin-left:0.2mm}

/* PROTOCOL CARD */
.prot-card{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:0.8mm;padding:0.8mm;margin-top:0.8mm}
.prot-header{display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#047857}
.prot-header .time{font-family:monospace;font-weight:400}
.prot-structure{font-size:4.5pt;color:#6b7280;margin-top:0.2mm}
</style></head><body>
<header class="page-header">
  <div class="header-left">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
    <div class="header-info">
      <h1>${studioName}</h1>
      <p><strong>Aluno:</strong> ${workout.client.name}</p>
      <p><strong>Programa:</strong> ${workout.phaseDuration} semanas • ${freq}x/semana</p>
      ${studioPhone ? `<p>${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</p>` : ''}
    </div>
  </div>
  <div class="header-right">
    <p><strong>Método Expert Training</strong></p>
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
</header>
<main>
${schedule.weeks?.map((w: any) => genWeek(w)).join('') || ''}
</main>
</body></html>`

    // Gerar PDF via API backend (Puppeteer)
    try {
      const res = await fetch('/api/pdf/treino', {
        method: 'POST',
        body: htmlContent,
        headers: { 'Content-Type': 'text/html' },
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Erro ao gerar PDF')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `Treino_${workout.client.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      // Fallback: abrir em nova janela para impressão
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        setTimeout(() => printWindow.print(), 300)
      }
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      ACTIVE: { variant: 'default', label: 'Ativo', icon: Play },
      PAUSED: { variant: 'secondary', label: 'Pausado', icon: Pause },
      COMPLETED: { variant: 'outline', label: 'Concluído', icon: CheckCircle },
      ARCHIVED: { variant: 'destructive', label: 'Arquivado', icon: Archive },
    }
    const config = variants[status] || variants.ACTIVE
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">{error || 'Treino não encontrado'}</h2>
        <Link href="/workouts">
          <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">Voltar</Button>
        </Link>
      </div>
    )
  }

  const rawSchedule = workout.scheduleJson as any

  // Função de fallback para gerar preparação quando não existe
  const generatePreparationFallback = (focus: string) => {
    const focusLabel = focus?.includes('LOWER') ? 'membros inferiores' : 
                       focus?.includes('UPPER') ? 'membros superiores' : 'geral'
    return {
      title: 'Preparação do Movimento',
      totalTime: '12 minutos',
      exercises: [
        { name: `Mobilidade articular (${focusLabel})`, duration: '3 min' },
        { name: 'Ativação de core e estabilizadores', duration: '3 min' },
        { name: 'Estabilidade articular', duration: '3 min' },
        { name: 'Ativação neuromuscular progressiva', duration: '3 min' },
      ],
    }
  }

  // Função de fallback para gerar protocolo final quando não existe
  const generateFinalProtocolFallback = (focus: string, phase: string) => {
    if (focus?.includes('CONDITIONING') || focus?.includes('CARDIO')) {
      return { name: 'Protocolo Metabólico', totalTime: '8 minutos', structure: '30s trabalho / 30s descanso × 8 rounds' }
    }
    if (phase === 'PEAK') {
      return { name: 'HIIT Intensivo', totalTime: '6 minutos', structure: '20s máximo / 40s recuperação × 6 rounds' }
    }
    return { name: 'Protocolo Regenerativo', totalTime: '6 minutos', structure: 'Respiração + alongamento ativo' }
  }

  // Enriquecer schedule com fallbacks para treinos antigos
  const schedule = rawSchedule ? {
    ...rawSchedule,
    weeks: rawSchedule.weeks?.map((week: any) => ({
      ...week,
      sessions: week.sessions?.map((session: any) => ({
        ...session,
        preparation: session.preparation || generatePreparationFallback(session.focus),
        finalProtocol: session.finalProtocol || generateFinalProtocolFallback(session.focus, week.phase),
      })),
    })),
  } : null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workouts" className="no-print">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Treino</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground font-medium">Cliente: {workout.client.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {getStatusBadge(workout.status)}
          </div>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Expert Training</h1>
          <p className="text-sm text-gray-600">Sistema de Treino Funcional</p>
        </div>
        <div className="border-t border-b py-4 mb-6">
          <h2 className="text-xl font-bold mb-2">Plano de Treino</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Cliente:</strong> {workout.client.name}</p>
              <p><strong>Email:</strong> {workout.client.email}</p>
            </div>
            <div>
              <p><strong>Data:</strong> {new Date(workout.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
              <p><strong>Status:</strong> {workout.status === 'ACTIVE' ? 'Ativo' : workout.status === 'PAUSED' ? 'Pausado' : workout.status === 'COMPLETED' ? 'Concluído' : 'Arquivado'}</p>
              <p><strong>Frequência:</strong> {workout.weeklyFrequency}x por semana</p>
              <p><strong>Duração:</strong> {workout.phaseDuration} semanas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{workout.client.name}</p>
            <p className="text-sm text-muted-foreground">{workout.client.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Frequência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.weeklyFrequency}x</p>
            <p className="text-sm text-muted-foreground">por semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Duração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.phaseDuration}</p>
            <p className="text-sm text-muted-foreground">semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Blocos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.blocks.length}</p>
            <p className="text-sm text-muted-foreground">no programa</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Link */}
      {workout.assessment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Baseado em Avaliação</h3>
                <p className="text-sm text-muted-foreground">
                  {workout.assessment.resultJson?.functionalPattern}
                </p>
              </div>
              <Link href={`/results/${workout.assessment.id}`}>
                <Button variant="outline">Ver Avaliação</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks Used */}
      <Card>
        <CardHeader>
          <CardTitle>Blocos Utilizados</CardTitle>
          <CardDescription>Exercícios e padrões de movimento do programa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {workout.blocks.map((block) => (
              <div key={block.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{block.name}</h4>
                  <Badge variant="outline">{block.code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{block.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Categoria: <span className="font-medium">{block.category}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Frequência: <span className="font-medium">{block.weeklyFrequency}x/sem</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preview */}
      {schedule && schedule.weeks && (
        <Card>
          <CardHeader>
            <CardTitle>Cronograma</CardTitle>
            <CardDescription>
              {schedule.weeks.length} semanas • {schedule.weeklyFrequency || 3} sessões por semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {schedule.weeks.slice(0, 4).map((week: any) => (
                <div key={week.week} className="space-y-4">
                  {/* Cabeçalho da Semana */}
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg">
                      {week.week}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Semana {week.week}</h4>
                      {week.phaseLabel && (
                        <span className="text-xs text-muted-foreground">
                          Fase: {week.phaseLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de Dias - Responsivo sem scroll */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {week.sessions.map((session: any) => (
                      <div key={session.session} className="border-2 border-border rounded-xl overflow-hidden bg-card hover:border-primary/50 transition-colors">
                        {/* Header do Dia */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
                                {session.session}
                              </div>
                              <span className="font-semibold">Dia {session.session}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {session.estimatedDuration} min
                            </span>
                          </div>
                        </div>

                        {/* Conteúdo do Dia */}
                        <div className="p-4 space-y-3">
                        
                          {/* Preparação do Movimento */}
                          {session.preparation && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                  Preparação
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                  {session.preparation.totalTime}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {session.preparation.exercises?.slice(0, 4).map((ex: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="truncate flex-1">{ex.name}</span>
                                    <span className="shrink-0 ml-1 font-mono">
                                      {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration}
                                    </span>
                                  </div>
                                ))}
                                {session.preparation.exercises?.length > 4 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    +{session.preparation.exercises.length - 4} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Blocos de Treino - Compacto */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Blocos
                            </span>
                            {session.blocks.map((b: any, idx: number) => (
                              <div key={idx} className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold text-foreground">
                                    {b.name || `Bloco ${idx + 1}`}
                                  </span>
                                  <span className="text-[10px] text-blue-500 font-mono">
                                    {b.restAfterBlock}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {b.exercises?.map((ex: any, exIdx: number) => (
                                    <div key={exIdx} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                          ex.role === 'FOCO_PRINCIPAL' ? 'bg-amber-500/20 text-amber-600' :
                                          ex.role === 'PUSH_PULL_INTEGRADO' ? 'bg-purple-500/20 text-purple-500' :
                                          'bg-green-500/20 text-green-600'
                                        }`}>
                                          {ex.role === 'FOCO_PRINCIPAL' ? 'F' : 
                                           ex.role === 'PUSH_PULL_INTEGRADO' ? 'P' : 'C'}
                                        </span>
                                        <span className="truncate font-medium">{ex.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 ml-2">
                                        {ex.sets && ex.reps && <span>{ex.sets}×{ex.reps}</span>}
                                        <span className="text-amber-500 font-mono">{ex.rest}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Protocolo Final */}
                          {session.finalProtocol && (
                            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  {session.finalProtocol.name}
                                </span>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-mono">
                                  {session.finalProtocol.totalTime}
                                </span>
                              </div>
                              {session.finalProtocol.structure && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {session.finalProtocol.structure}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {schedule.weeks.length > 4 && (
                <p className="text-sm text-muted-foreground text-center">
                  + {schedule.weeks.length - 4} semanas adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {workout.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Ações do Treino</h3>
              <p className="text-sm text-muted-foreground">
                Criado por {workout.creator.name} em{' '}
                {new Date(workout.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {workout.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('PAUSED')}
                  disabled={updating}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              {workout.status === 'PAUSED' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  disabled={updating}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Reativar
                </Button>
              )}
              {(workout.status === 'ACTIVE' || workout.status === 'PAUSED') && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
              )}
              {workout.status !== 'ARCHIVED' && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={updating}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Footer - Only visible when printing */}
      <div className="print-only print-footer">
        <p>Expert Training - Sistema de Treino Funcional | www.experttraining.com.br</p>
        <p>Documento gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}
