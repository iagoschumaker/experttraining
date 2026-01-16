'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dumbbell,
  Calendar,
  Clock,
  AlertTriangle,
  LogOut,
  Target,
  Activity,
  Download,
} from 'lucide-react'

interface WorkoutData {
  client: {
    name: string
  }
  studio: {
    name: string
    logoUrl: string | null
    phone: string | null
  }
  workout: {
    id: string
    name: string
    schedule: any
    startDate: string | null
    endDate: string | null
    createdAt: string
  } | null
  reassessment: {
    needed: boolean
    daysSinceLastAssessment: number | null
    lastAssessmentDate: string | null
  }
}

export default function TreinoAlunoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WorkoutData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTreino()
  }, [])

  const fetchTreino = async () => {
    try {
      const res = await fetch('/api/areaaluno/treino')
      const result = await res.json()

      if (result.success) {
        setData(result.data)
      } else if (res.status === 401) {
        router.push('/areaaluno')
      } else {
        setError(result.error || 'Erro ao carregar treino')
      }
    } catch (err) {
      console.error('Erro:', err)
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/areaaluno/auth', { method: 'DELETE' })
    router.push('/areaaluno')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleDownloadPDF = async () => {
    if (!data?.workout || !schedule) return

    const freq = schedule.weeklyFrequency || 3
    const studioName = data.studio?.name || 'Studio'
    const studioLogo = data.studio?.logoUrl || ''
    const studioPhone = data.studio?.phone || ''

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
<title>Treino ${data.client.name}</title>
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
      <p><strong>Aluno:</strong> ${data.client.name}</p>
      <p><strong>Programa:</strong> ${data.workout.name} • ${freq}x/semana</p>
      ${studioPhone ? `<p>${studioPhone}</p>` : ''}
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
      a.download = `Treino_${data.client.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-20 bg-zinc-700" />
          <Skeleton className="h-40 bg-zinc-700" />
          <Skeleton className="h-60 bg-zinc-700" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-zinc-700 bg-zinc-800/50">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => router.push('/areaaluno')} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const schedule = data.workout?.schedule

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {/* Header */}
      <header className="bg-zinc-800/80 backdrop-blur border-b border-zinc-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.studio.logoUrl ? (
              <img
                src={data.studio.logoUrl}
                alt={data.studio.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-amber-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{data.studio.name}</p>
              <p className="text-xs text-zinc-400">Olá, {data.client.name.split(' ')[0]}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        {/* Aviso de Reavaliação */}
        {data.reassessment.needed && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Hora de reavaliar!
                </p>
                <p className="text-xs text-amber-400/70">
                  Sua última avaliação foi há {data.reassessment.daysSinceLastAssessment} dias.
                  Fale com seu personal.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sem Treino */}
        {!data.workout && (
          <Card className="border-zinc-700 bg-zinc-800/50">
            <CardContent className="py-12 text-center">
              <Dumbbell className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Nenhum treino ativo
              </h3>
              <p className="text-sm text-zinc-400">
                Você ainda não possui um treino cadastrado.
                <br />
                Fale com seu personal trainer.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Treino Ativo */}
        {data.workout && schedule && schedule.weeks && (
          <>
            {/* Info do Treino */}
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500" />
                      {data.workout.name}
                    </CardTitle>
                    {(data.workout.startDate || data.workout.endDate) && (
                      <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(data.workout.startDate)} 
                        {data.workout.endDate && ` → ${formatDate(data.workout.endDate)}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Cronograma - Mesmo layout do studio */}
            <Card className="border-zinc-700 bg-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-white">Seu Cronograma</CardTitle>
                <CardDescription className="text-zinc-400">
                  {schedule.weeks.length} semanas • {schedule.weeklyFrequency || 3} sessões por semana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {schedule.weeks.map((week: any) => (
                    <div key={week.week} className="space-y-4">
                      {/* Cabeçalho da Semana */}
                      <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-500/20">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-lg">
                          {week.week}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg text-white">Semana {week.week}</h4>
                          {week.phaseLabel && (
                            <span className="text-xs text-zinc-400">
                              Fase: {week.phaseLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grid de Dias */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {week.sessions.map((session: any) => (
                          <div key={session.session} className="border-2 border-zinc-700 rounded-xl overflow-hidden bg-zinc-800/80 hover:border-amber-500/50 transition-colors">
                            {/* Header do Dia */}
                            <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-4 py-3 border-b border-zinc-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500 text-black font-bold text-sm">
                                    {session.session}
                                  </div>
                                  <span className="font-semibold text-white">Dia {session.session}</span>
                                </div>
                                <span className="text-xs text-zinc-400 font-mono">
                                  {session.estimatedDuration} min
                                </span>
                              </div>
                            </div>

                            {/* Conteúdo do Dia */}
                            <div className="p-4 space-y-3">
                              {/* Preparação */}
                              {session.preparation && (
                                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-amber-400">
                                      Preparação
                                    </span>
                                    <span className="text-[10px] text-amber-400 font-mono">
                                      {session.preparation.totalTime}
                                    </span>
                                  </div>
                                  <div className="space-y-0.5">
                                    {session.preparation.exercises?.slice(0, 4).map((ex: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-400">
                                        <span className="truncate flex-1">{ex.name}</span>
                                        <span className="shrink-0 ml-1 font-mono">
                                          {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration}
                                        </span>
                                      </div>
                                    ))}
                                    {session.preparation.exercises?.length > 4 && (
                                      <span className="text-[9px] text-zinc-500">
                                        +{session.preparation.exercises.length - 4} mais
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Blocos de Treino */}
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                                  Blocos
                                </span>
                                {session.blocks.map((b: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-semibold text-white">
                                        {b.name || `Bloco ${idx + 1}`}
                                      </span>
                                      <span className="text-[10px] text-blue-400 font-mono">
                                        {b.restAfterBlock}
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {b.exercises?.map((ex: any, exIdx: number) => (
                                        <div key={exIdx} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                              ex.role === 'FOCO_PRINCIPAL' ? 'bg-amber-500/20 text-amber-400' :
                                              ex.role === 'PUSH_PULL_INTEGRADO' ? 'bg-purple-500/20 text-purple-400' :
                                              'bg-green-500/20 text-green-400'
                                            }`}>
                                              {ex.role === 'FOCO_PRINCIPAL' ? 'F' : 
                                               ex.role === 'PUSH_PULL_INTEGRADO' ? 'P' : 'C'}
                                            </span>
                                            <span className="truncate font-medium text-white">{ex.name}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0 ml-2">
                                            {ex.sets && ex.reps && <span>{ex.sets}×{ex.reps}</span>}
                                            <span className="text-amber-400 font-mono">{ex.rest}</span>
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
                                    <span className="text-xs font-semibold text-green-400">
                                      {session.finalProtocol.name}
                                    </span>
                                    <span className="text-[10px] text-green-400 font-mono">
                                      {session.finalProtocol.totalTime}
                                    </span>
                                  </div>
                                  {session.finalProtocol.structure && (
                                    <p className="text-[10px] text-zinc-400 mt-1">
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
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Contato do Studio */}
        {data.studio.phone && (
          <div className="text-center pt-4">
            <p className="text-xs text-zinc-500">
              Dúvidas? Fale com o studio:{' '}
              <a
                href={`https://wa.me/55${data.studio.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline"
              >
                {data.studio.phone}
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
