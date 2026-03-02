// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL PAGE
// ============================================================================
// Visualização completa do treino - Compartilhado entre Studio e Personal
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Weight,
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
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [updating, setUpdating] = useState(false)
  const [savingWeight, setSavingWeight] = useState<string | null>(null) // key like 'w0-s1-b2-e3'
  const [registeringAttendance, setRegisteringAttendance] = useState(false)
  const [attendanceSuccess, setAttendanceSuccess] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  // Auto-download PDF if autoDownload parameter is present
  useEffect(() => {
    if (searchParams.get('autoDownload') === 'true' && workout && !loading) {
      handleDownloadPDF()
    }
  }, [searchParams, workout, loading])

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

  // Save exercise weight
  const saveWeight = async (weekIdx: number, sessionIdx: number, blockIdx: number, exerciseIdx: number, weight: string) => {
    const key = `w${weekIdx}-s${sessionIdx}-b${blockIdx}-e${exerciseIdx}`
    setSavingWeight(key)
    try {
      await fetch(`/api/studio/workouts/${params.id}/exercise-weight`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekIdx, sessionIdx, blockIdx, exerciseIdx, weight: weight || null }),
      })
      // Update local state
      if (workout) {
        const s = JSON.parse(JSON.stringify(workout.scheduleJson)) as any
        if (s?.weeks?.[weekIdx]?.sessions?.[sessionIdx]?.blocks?.[blockIdx]?.exercises?.[exerciseIdx]) {
          s.weeks[weekIdx].sessions[sessionIdx].blocks[blockIdx].exercises[exerciseIdx].weight = weight || null
          setWorkout({ ...workout, scheduleJson: s })
        }
      }
    } catch (err) {
      console.error('Error saving weight:', err)
    } finally {
      setSavingWeight(null)
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

  async function handleRegisterAttendance() {
    setRegisteringAttendance(true)
    setAttendanceSuccess(false)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}/next-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (data.success) {
        setAttendanceSuccess(true)
        // Recarregar dados do treino para atualizar progresso
        loadWorkout()
        setTimeout(() => setAttendanceSuccess(false), 3000)
      } else {
        alert(data.error || 'Erro ao registrar presença')
      }
    } catch (err) {
      console.error('Attendance error:', err)
      alert('Erro de conexão')
    } finally {
      setRegisteringAttendance(false)
    }
  }

  // ========================================================================
  // FUNÇÃO DE DOWNLOAD PDF - ULTRA COMPACTO (4 SEMANAS EM 1 PÁGINA A4)
  // ========================================================================
  async function handleDownloadPDF() {
    if (!workout || !schedule) return

    console.log('📊 Schedule weeks:', schedule.weeks?.length, schedule.weeks)

    const freq = workout.weeklyFrequency || 3
    const totalDays = schedule.weeks?.[0]?.sessions?.length || freq
    const studioName = workout.studio?.name || 'Studio'
    const studioLogo = workout.studio?.logoUrl || ''
    const studioPhone = workout.studio?.phone || ''
    const studioEmail = workout.studio?.email || ''

    console.log('🎨 Studio logo URL:', studioLogo)

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
      const isSecundario = ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO'
      const label = ex.role === 'FOCO_PRINCIPAL' ? 'F' : isSecundario ? 'S' : 'C'
      const cls = ex.role === 'FOCO_PRINCIPAL' ? 'ex-f' : isSecundario ? 'ex-p' : 'ex-c'
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

    // Cores do pilar
    const pillarColor = (p: string) => p === 'LOWER' ? '#f59e0b' : p === 'PUSH' ? '#3b82f6' : '#8b5cf6'
    const pillarBg = (p: string) => p === 'LOWER' ? '#fef3c7' : p === 'PUSH' ? '#dbeafe' : '#ede9fe'

    // Gerar sessão/dia (card igual desktop)
    const genSession = (s: any) => `
      <div class="day-card">
        <div class="day-header">
          <div class="day-badge">${s.session}</div>
          <span class="day-title">Dia ${s.session}</span>
          ${s.pillarLabel ? `<span class="pillar-badge" style="background:${pillarBg(s.pillar)};color:${pillarColor(s.pillar)};padding:1mm 2mm;border-radius:1mm;font-size:6.5pt;font-weight:700">${s.pillarLabel}</span>` : ''}
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
    const genWeek = (w: any, isLast: boolean) => {
      console.log(`🔍 Gerando semana:`, { week: w.week, phase: w.phase, phaseLabel: w.phaseLabel, isLast })
      return `
      <section class="week-section${isLast ? ' last-week' : ''}">
        <div class="week-header">
          <div class="week-badge">${w.week || '?'}</div>
          <div class="week-info">
            <h2>Semana ${w.week || '?'}</h2>
            ${w.phaseLabel ? `<span class="phase-label">Fase: ${w.phaseLabel}</span>` : ''}
          </div>
        </div>
        <div class="days-grid">
          ${w.sessions.map((s: any) => genSession(s)).join('')}
        </div>
      </section>
    `
    }

    // Calcular escala dinâmica baseada no número de dias
    // Layout inteligente baseado no número de dias
    const getLayout = (days: number) => {
      if (days <= 3) return { cols: 3, scale: 1 }
      if (days === 4) return { cols: 2, scale: 0.95 }
      if (days === 5) return { cols: 2, scale: 0.9 }
      if (days === 6) return { cols: 2, scale: 0.85 }
      return { cols: 1, scale: 0.8 }
    }

    const layout = getLayout(totalDays)

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:10mm 10mm 12mm 10mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:8pt;color:#1a1a1a;line-height:1.3;background:#fff}

/* HEADER FIXO E DOMINANTE */
.pdf-header{position:fixed;top:0;left:0;right:0;height:26mm;padding:6mm 8mm;border-bottom:2px solid #f59e0b;background:#fff;z-index:100}
.header-content{display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:4mm}
.header-left img{height:14mm;max-width:35mm;object-fit:contain}
.header-info h1{font-size:12pt;font-weight:700;color:#1a1a1a;margin-bottom:1mm}
.header-info p{font-size:8.5pt;color:#666;margin:0.4mm 0;line-height:1.3}
.header-right{text-align:right;font-size:8.5pt;color:#666}
.header-right strong{color:#1a1a1a;display:block;margin-bottom:1mm;font-size:9pt}

/* FOOTER FIXO */
.pdf-footer{position:fixed;bottom:4mm;left:0;right:0;font-size:7pt;text-align:center;color:#999}

/* ÁREA DE CONTEÚDO */
.pdf-content{margin-top:28mm;margin-bottom:12mm;transform-origin:top center;transform:scale(${layout.scale})}

/* WEEK SECTION - 1 página por semana */
.week-section{page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;min-height:calc(100vh - 40mm);page-break-before:auto}
.week-section:not(:first-child){margin-top:30mm}
.week-section.last-week{page-break-after:auto;break-after:auto}
.week-header{display:flex;align-items:center;gap:2mm;padding-bottom:2mm;margin-bottom:4mm;border-bottom:1px solid #e5e5e5;page-break-inside:avoid;break-inside:avoid;page-break-after:avoid;break-after:avoid}
.week-badge{width:9mm;height:9mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:10pt;display:flex;align-items:center;justify-content:center;border-radius:2mm;flex-shrink:0}
.week-info{flex:1;min-width:0}
.week-info h2{font-size:11pt;font-weight:600;color:#1a1a1a;margin:0;page-break-before:avoid;break-before:avoid}
.phase-label{font-size:7.5pt;color:#888;margin-left:2mm}

/* DAYS GRID - Dinâmico com CSS variables */
.days-grid{display:grid;grid-template-columns:repeat(${layout.cols}, 1fr);gap:4mm;align-items:stretch}

/* DAY CARD - Cresce para preencher espaço */
.day-card{border:1px solid #e5e5e5;border-radius:2mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;height:100%}
.day-header{background:linear-gradient(135deg,#fef3c7,#fef9c3);padding:2.5mm;display:flex;align-items:center;gap:2mm;border-bottom:1px solid #fcd34d}
.day-badge{width:7mm;height:7mm;background:#f59e0b;color:#fff;font-weight:700;font-size:8.5pt;display:flex;align-items:center;justify-content:center;border-radius:1mm}
.day-title{font-weight:600;font-size:8.5pt;flex:1}
.day-duration{font-size:7.5pt;color:#92400e;font-family:monospace}
.day-content{padding:2.5mm;flex:1;display:flex;flex-direction:column;gap:2mm}

/* PREP CARD */
.prep-card{background:#fffbeb;border:1px solid #fcd34d;border-radius:1.5mm;padding:2.5mm;margin-bottom:2mm;break-inside:avoid;page-break-inside:avoid}
.prep-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#b45309;margin-bottom:1mm}
.prep-header .time{font-family:monospace;font-weight:400}
.prep-content{font-size:7.5pt;color:#78716c}
.prep-item{display:flex;justify-content:space-between;padding:0.6mm 0}

/* BLOCKS */
.blocks-label{font-size:7.5pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;margin:2mm 0 1.5mm}
.block-card{background:#eff6ff;border:1px solid #93c5fd;border-radius:1.5mm;padding:2.5mm;margin-bottom:2mm;break-inside:avoid;page-break-inside:avoid}
.block-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#1e40af;margin-bottom:1mm}
.block-header .time{font-family:monospace;font-weight:400;color:#3b82f6}
.block-content{background:#fff;border-radius:1mm;overflow:hidden}

/* EXERCISE ROW */
.ex-row{display:flex;align-items:center;padding:1.5mm;border-bottom:1px solid #e0f2fe;font-size:6pt}
.ex-row:last-child{border-bottom:none}
.ex-badge{width:5mm;height:5mm;font-size:6pt;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:0.8mm;margin-right:1.5mm;flex-shrink:0}
.ex-f{background:#ffedd5;color:#c2410c}
.ex-p{background:#f3e8ff;color:#7c3aed}
.ex-c{background:#dcfce7;color:#15803d}
.ex-name{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:6pt}
.ex-info{font-size:5.5pt;color:#6b7280;margin-left:1mm;white-space:nowrap;flex-shrink:0}
.ex-info em{color:#f59e0b;font-style:normal;margin-left:0.4mm;font-size:5pt}

/* PROTOCOL CARD */
.prot-card{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:1.5mm;padding:2.5mm;margin-top:2mm;break-inside:avoid;page-break-inside:avoid}
.prot-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#047857}
.prot-header .time{font-family:monospace;font-weight:400}
.prot-structure{font-size:7.5pt;color:#6b7280;margin-top:1mm}
</style></head><body>
<header class="pdf-header">
  <div class="header-content">
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
    <strong>Método Expert Pro Training</strong>
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
  </div>
</header>
<main class="pdf-content">
${schedule.weeks?.map((w: any, idx: number) => genWeek(w, idx === schedule.weeks.length - 1)).join('') || ''}
</main>
<footer class="pdf-footer">
  <p>METODOLOGIA Expert Pro Training</p>
</footer>
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

      {/* Attendance / Progress Card */}
      {workout.status === 'ACTIVE' && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-amber-500" />
              Progresso do Programa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const p = (workout as any).progress
              if (!p) return <p className="text-sm text-muted-foreground">Dados de progresso não disponíveis</p>

              const pct = Math.round((p.attendanceRate ?? 0) * 100)
              const statusColor = p.attendanceStatus === 'ON_TRACK' ? 'text-green-500'
                : p.attendanceStatus === 'BELOW_TARGET' ? 'text-yellow-500'
                  : 'text-red-500'
              const barColor = p.attendanceStatus === 'ON_TRACK' ? 'bg-green-500'
                : p.attendanceStatus === 'BELOW_TARGET' ? 'bg-yellow-500'
                  : 'bg-red-500'

              return (
                <>
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Frequência</span>
                      <span className={`font-bold ${statusColor}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Meta: 85% para progressão</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">{p.sessionsCompleted ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Sessões feitas</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">{p.sessionsExpectedByNow ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Sessões esperadas</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">Sem. {p.currentWeek ?? 1}</div>
                      <div className="text-xs text-muted-foreground">Semana atual</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-amber-500">{p.currentPhaseLabel ?? 'Adaptação'}</div>
                      <div className="text-xs text-muted-foreground">Fase</div>
                    </div>
                  </div>

                  {/* Register Attendance Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleRegisterAttendance}
                      disabled={registeringAttendance || p.isComplete}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                    >
                      {registeringAttendance ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {p.isComplete ? 'Programa Completo' : 'Registrar Presença'}
                    </Button>

                    {attendanceSuccess && (
                      <span className="text-sm text-green-500 font-medium animate-pulse">
                        ✅ Presença registrada!
                      </span>
                    )}

                    {p.mustExtend && (
                      <span className="text-sm text-yellow-500">
                        ⚠️ Frequência abaixo de 85% — programa prolongado
                      </span>
                    )}

                    {p.canReassess && !p.isComplete && (
                      <span className="text-sm text-green-500">
                        ✅ Apto a reavaliar e gerar novo treino
                      </span>
                    )}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Presença */}
      {(workout as any).attendanceLessons?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-green-500" />
              Histórico de Presença
            </CardTitle>
            <CardDescription>
              {(workout as any).attendanceLessons.length} sessão(ões) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(workout as any).attendanceLessons.map((lesson: any, i: number) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(lesson.date).toLocaleDateString('pt-BR', {
                          timeZone: 'UTC',
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.focus || 'Treino'} • Sem. {lesson.weekIndex || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {new Date(lesson.startedAt).toLocaleTimeString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dia {lesson.dayIndex || i + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                              {session.pillarLabel && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${session.pillar === 'LOWER' ? 'bg-amber-500/20 text-amber-600' :
                                  session.pillar === 'PUSH' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-purple-500/20 text-purple-500'
                                  }`}>
                                  {session.pillarLabel}
                                </span>
                              )}
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
                                  {b.exercises?.map((ex: any, exIdx: number) => {
                                    const wKey = `w${schedule.weeks.indexOf(week)}-s${week.sessions.indexOf(session)}-b${idx}-e${exIdx}`
                                    const wIdx = schedule.weeks.indexOf(week)
                                    const sIdx = week.sessions.indexOf(session)
                                    return (
                                      <div key={exIdx} className="flex items-center justify-between text-xs gap-1">
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${ex.role === 'FOCO_PRINCIPAL' ? 'bg-amber-500/20 text-amber-600' :
                                            (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'bg-purple-500/20 text-purple-500' :
                                              'bg-green-500/20 text-green-600'
                                            }`}>
                                            {ex.role === 'FOCO_PRINCIPAL' ? 'F' :
                                              (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'}
                                          </span>
                                          <span className="truncate font-medium">{ex.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                          {ex.sets && ex.reps && <span className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps}</span>}
                                          <span className="text-[10px] text-amber-500 font-mono">{ex.rest}</span>
                                          {/* Weight Input */}
                                          <div className="flex items-center gap-0.5">
                                            <Weight className="w-3 h-3 text-muted-foreground" />
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="—"
                                              defaultValue={ex.weight || ''}
                                              className={`w-12 text-[10px] text-center rounded border bg-background px-0.5 py-0.5 focus:ring-1 focus:ring-primary outline-none ${savingWeight === wKey ? 'border-green-400 bg-green-500/10' : 'border-border'
                                                }`}
                                              onBlur={(e) => {
                                                const val = e.target.value.trim()
                                                if (val !== (ex.weight || '')) {
                                                  saveWeight(wIdx, sIdx, idx, exIdx, val)
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  (e.target as HTMLInputElement).blur()
                                                }
                                              }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">kg</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
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
