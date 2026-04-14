// ============================================================================
// EXPERT PRO TRAINING - GENERATE WORKOUT PAGE v2
// ============================================================================
// Fluxo: Avaliação → Objetivo → Fase → Frequência → Gerar
// ============================================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Layers,
  Dumbbell,
} from 'lucide-react'
import Link from 'next/link'

// ============================================================================
// TIPOS
// ============================================================================

interface Assessment {
  id: string
  createdAt: string
  client: {
    id: string
    name: string
  }
  resultJson: {
    functionalPattern?: string
    primaryFocus?: string
    primaryGoal?: string
    allowedBlocks?: string[]
    blockedBlocks?: string[]
    recommendations?: string[]
  }
  confidence: number
}

interface PhaseOption {
  value: string
  label: string
  isCurrent: boolean
  isRecommended: boolean
}

interface ObjectiveOption {
  value: string
  label: string
}

// ============================================================================
// OBJETIVO LABELS (para exibição no front)
// ============================================================================

const OBJECTIVE_ICONS: Record<string, string> = {
  EMAGRECIMENTO: '🔥',
  HIPERTROFIA_OBJ: '💪',
  PERFORMANCE: '⚡',
  REABILITACAO: '🏥',
}

const OBJECTIVE_DESCRIPTIONS: Record<string, string> = {
  EMAGRECIMENTO: 'Foco em queima de gordura com fases de condicionamento, força, resistência e metabólico',
  HIPERTROFIA_OBJ: 'Foco em ganho muscular com fases de condicionamento, força e hipertrofia progressiva',
  PERFORMANCE: 'Foco em desempenho esportivo com fases de condicionamento, força, potência e resistência',
  REABILITACAO: 'Foco em recuperação e saúde com fases de condicionamento e força',
}

const PHASE_DESCRIPTIONS: Record<string, string> = {
  CONDICIONAMENTO_1: 'Fundamento do método — mobilidade, ativação e exercícios base. Obrigatório para todos.',
  CONDICIONAMENTO_2: 'Continuação do condicionamento — exercícios com progressão de carga e volume.',
  HIPERTROFIA: 'Foco em ganho muscular com séries de 8-12 reps e carga progressiva.',
  FORCA: 'Foco em força máxima com séries de 5-8 reps e cargas altas (80-85%).',
  POTENCIA: 'Foco explosivo com exercícios pliométricos e cargas altas (85%).',
  RESISTENCIA: 'Foco em resistência muscular com exercícios intercalados de força e cardio.',
  METABOLICO: 'Circuitos de alta intensidade — exercícios compostos em formato de circuito.',
  HIPERTROFIA_2: 'Variação II da hipertrofia — exercícios diferentes, mesma estrutura de progressão.',
  FORCA_2: 'Variação II da força — exercícios diferentes para evitar platô.',
  RESISTENCIA_2: 'Variação II da resistência — novos exercícios e desafios cardiovasculares.',
  METABOLICO_2: 'Variação II do metabólico — novos circuitos e combinações de exercícios.',
}

// ============================================================================
// STEPS DO WIZARD
// ============================================================================

type Step = 'assessment' | 'objective' | 'phase' | 'config' | 'confirm'

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'assessment', label: 'Avaliação', icon: <Activity className="h-4 w-4" /> },
  { key: 'objective', label: 'Objetivo', icon: <Target className="h-4 w-4" /> },
  { key: 'phase', label: 'Fase', icon: <Layers className="h-4 w-4" /> },
  { key: 'config', label: 'Configurar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'confirm', label: 'Gerar', icon: <Zap className="h-4 w-4" /> },
]

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function GenerateWorkoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')

  // State
  const [step, setStep] = useState<Step>('assessment')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [phases, setPhases] = useState<PhaseOption[]>([])
  const [objectives, setObjectives] = useState<ObjectiveOption[]>([])
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [weeklyFrequency, setWeeklyFrequency] = useState(3)
  const [notes, setNotes] = useState('')
  const [levelUp, setLevelUp] = useState(false)

  // ========================================================================
  // LOAD ASSESSMENTS
  // ========================================================================
  useEffect(() => {
    loadAvailableAssessments()
  }, [])

  useEffect(() => {
    if (assessmentId && availableAssessments.length > 0) {
      const found = availableAssessments.find(a => a.id === assessmentId)
      if (found) {
        handleSelectAssessment(found)
      }
    }
  }, [assessmentId, availableAssessments])

  async function loadAvailableAssessments() {
    try {
      const res = await fetch('/api/studio/assessments?status=COMPLETED&pageSize=50')
      const data = await res.json()

      if (data.success) {
        const items = data.data.items || data.data || []
        setAvailableAssessments(items.filter((a: Assessment) => a.resultJson))
      }
    } catch (err) {
      console.error('Error loading assessments:', err)
      setError('Erro ao carregar avaliações')
    } finally {
      setLoading(false)
    }
  }

  // ========================================================================
  // SELECT ASSESSMENT → LOAD PHASES
  // ========================================================================
  async function handleSelectAssessment(assessment: Assessment) {
    setSelectedAssessment(assessment)
    setError(null)

    // Load phases for this client
    try {
      const objectiveParam = selectedObjective ? `&objective=${selectedObjective}` : ''
      const res = await fetch(`/api/studio/workouts/phases?clientId=${assessment.client.id}${objectiveParam}`)
      const data = await res.json()

      if (data.success) {
        setClientInfo(data.data.client)
        setPhases(data.data.phases)
        setObjectives(data.data.objectives)

        // Auto-select objective if client already has one
        if (data.data.client.objective) {
          setSelectedObjective(data.data.client.objective)
        }

        setStep('objective')
      }
    } catch (err) {
      console.error('Error loading phases:', err)
      setError('Erro ao carregar fases do cliente')
    }
  }

  // ========================================================================
  // SELECT OBJECTIVE → RELOAD PHASES
  // ========================================================================
  async function handleSelectObjective(objective: string) {
    setSelectedObjective(objective)
    setError(null)

    if (!selectedAssessment) return

    try {
      const res = await fetch(`/api/studio/workouts/phases?clientId=${selectedAssessment.client.id}&objective=${objective}`)
      const data = await res.json()

      if (data.success) {
        setPhases(data.data.phases)
        // Auto-select recommended or first phase
        const recommended = data.data.phases.find((p: PhaseOption) => p.isRecommended)
        if (recommended) {
          setSelectedPhase(recommended.value)
        }
        setStep('phase')
      }
    } catch (err) {
      console.error('Error reloading phases:', err)
    }
  }

  // ========================================================================
  // GENERATE
  // ========================================================================
  async function handleGenerate() {
    if (!selectedAssessment || !selectedPhase) {
      setError('Selecione todos os campos')
      return
    }

    setError(null)
    setGenerating(true)

    try {
      const payload = {
        assessmentId: selectedAssessment.id,
        phase: selectedPhase,
        weeklyFrequency,
        notes,
        levelUp,
      }

      console.log('🚀 Generating workout v2:', payload)

      const res = await fetch('/api/studio/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/workouts/${data.data.workout.id}`)
      } else {
        setError(data.error || 'Erro ao gerar treino')
        console.error('❌ Generation failed:', data)
      }
    } catch (err) {
      console.error('Generate error:', err)
      setError('Erro de conexão')
    } finally {
      setGenerating(false)
    }
  }

  // ========================================================================
  // STEP NAVIGATION
  // ========================================================================
  const stepIndex = STEPS.findIndex(s => s.key === step)

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key)
      setError(null)
    }
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workouts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-amber-500" />
            Gerar Treino
          </h1>
          <p className="text-sm text-muted-foreground">Método Expert Pro Training</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === stepIndex
                  ? 'bg-amber-500 text-white'
                  : i < stepIndex
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < stepIndex ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                s.icon
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 ${i < stepIndex ? 'bg-amber-500' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 1: SELECIONAR AVALIAÇÃO */}
      {/* ================================================================== */}
      {step === 'assessment' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Selecione a Avaliação</h2>

          {availableAssessments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma avaliação concluída encontrada</p>
                <Link href="/assessments/new" className="mt-4 inline-block">
                  <Button variant="outline">Criar Avaliação</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {availableAssessments.map((a) => (
                <Card
                  key={a.id}
                  className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                    selectedAssessment?.id === a.id ? 'border-amber-500 bg-amber-500/5' : ''
                  }`}
                  onClick={() => handleSelectAssessment(a)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{a.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                        {a.resultJson?.primaryGoal && (
                          <span className="ml-2">• {a.resultJson.primaryGoal}</span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: SELECIONAR OBJETIVO */}
      {/* ================================================================== */}
      {step === 'objective' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Objetivo do Aluno</h2>
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          {clientInfo && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-muted-foreground">Aluno:</span>{' '}
              <span className="font-medium text-foreground">{clientInfo.name}</span>
              <span className="mx-2">•</span>
              <span className="text-muted-foreground">Nível:</span>{' '}
              <Badge variant="outline">{clientInfo.levelLabel}</Badge>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {objectives.map((obj) => (
              <Card
                key={obj.value}
                className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                  selectedObjective === obj.value ? 'border-amber-500 bg-amber-500/5' : ''
                }`}
                onClick={() => handleSelectObjective(obj.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{OBJECTIVE_ICONS[obj.value] || '🎯'}</span>
                    <h3 className="font-semibold text-foreground">{obj.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {OBJECTIVE_DESCRIPTIONS[obj.value] || ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: SELECIONAR FASE */}
      {/* ================================================================== */}
      {step === 'phase' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Selecione a Fase</h2>
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Cada fase dura <span className="text-amber-500 font-semibold">6 semanas</span> com exercícios fixos.
            A fase recomendada está destacada.
          </p>

          <div className="grid gap-3">
            {phases.map((phase, i) => (
              <Card
                key={phase.value}
                className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                  selectedPhase === phase.value
                    ? 'border-amber-500 bg-amber-500/5'
                    : phase.isRecommended
                    ? 'border-amber-500/30'
                    : ''
                }`}
                onClick={() => {
                  setSelectedPhase(phase.value)
                  setStep('config')
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        phase.isCurrent
                          ? 'bg-green-500 text-white'
                          : phase.isRecommended
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{phase.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {PHASE_DESCRIPTIONS[phase.value] || '6 semanas'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phase.isCurrent && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Atual
                        </Badge>
                      )}
                      {phase.isRecommended && (
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                          Recomendada
                        </Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: CONFIGURAR FREQUÊNCIA */}
      {/* ================================================================== */}
      {step === 'config' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Configurar Treino</h2>
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          {/* Summary */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Aluno</p>
                  <p className="font-medium text-foreground text-sm">{selectedAssessment?.client.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
                  <p className="font-medium text-foreground text-sm">
                    {OBJECTIVE_ICONS[selectedObjective || ''] || ''}{' '}
                    {objectives.find(o => o.value === selectedObjective)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fase</p>
                  <p className="font-medium text-amber-500 text-sm">
                    {phases.find(p => p.value === selectedPhase)?.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frequency */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Frequência Semanal</CardTitle>
              <CardDescription>Quantos dias por semana o aluno treina?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5, 6].map(freq => (
                  <Button
                    key={freq}
                    variant={weeklyFrequency === freq ? 'default' : 'outline'}
                    className={weeklyFrequency === freq ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    onClick={() => setWeeklyFrequency(freq)}
                  >
                    {freq}x
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total: {weeklyFrequency * 6} sessões em 6 semanas
              </p>
            </CardContent>
          </Card>

          {/* Level Up */}
          {clientInfo?.level !== 'AVANCADO' && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={levelUp}
                    onChange={(e) => setLevelUp(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      Subir de nível
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avançar de {clientInfo?.levelLabel} para o próximo nível
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Observações (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o treino..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            size="lg"
            onClick={() => setStep('confirm')}
          >
            Revisar e Gerar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5: CONFIRMAR E GERAR */}
      {/* ================================================================== */}
      {step === 'confirm' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Confirmar Geração</h2>
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          <Card className="mb-6 border-amber-500/30">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Aluno</span>
                  <span className="font-medium text-foreground">{selectedAssessment?.client.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Nível</span>
                  <Badge variant="outline">{clientInfo?.levelLabel}{levelUp ? ' → Próximo' : ''}</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Objetivo</span>
                  <span className="font-medium text-foreground">
                    {OBJECTIVE_ICONS[selectedObjective || '']}{' '}
                    {objectives.find(o => o.value === selectedObjective)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Fase</span>
                  <span className="font-semibold text-amber-500">
                    {phases.find(p => p.value === selectedPhase)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Frequência</span>
                  <span className="font-medium text-foreground">{weeklyFrequency}x por semana</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Duração</span>
                  <span className="font-medium text-foreground">6 semanas ({weeklyFrequency * 6} sessões)</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Treinos</span>
                  <span className="font-medium text-foreground">Perna • Empurra • Puxa (rotação)</span>
                </div>
              </div>

              {notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm text-foreground">{notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={goBack} disabled={generating}>
              Voltar
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              size="lg"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Treino
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GenerateWorkoutPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <GenerateWorkoutPage />
    </Suspense>
  )
}
