// ============================================================================
// EXPERT PRO TRAINING - GENERATE WORKOUT PAGE v3
// ============================================================================
// Fluxo: Avaliação → Objetivo → Fase → Modo (Auto/Manual) → [Editar] → Gerar
// ============================================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  GripVertical,
  Settings2,
  Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { translatePainRegion, translateMovementPattern } from '@/lib/translations'

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
  resultJson: any
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

interface AssessmentContext {
  id: string
  complaints: string[]
  painMap: Record<string, number>
  movementTests: Record<string, { score: number; observations: string }>
  level: string
}

interface EditableExercise {
  name: string
  reps: string
  weeklyReps?: string[]
  weeklyLoad?: string[]
  _warnings?: string[]
}

interface EditableBlock {
  name: string
  exercises: EditableExercise[]
}

interface EditableTreino {
  pillar: string
  pillarLabel: string
  series: string
  blocos: EditableBlock[]
  protocoloFinal: string
}

// ============================================================================
// CONSTANTES E HELPERS
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
  CONDICIONAMENTO_1: 'Fundamento do método — mobilidade, ativação e exercícios base.',
  CONDICIONAMENTO_2: 'Continuação do condicionamento — progressão de carga e volume.',
  HIPERTROFIA: 'Foco em ganho muscular com séries de 8-12 reps e carga progressiva.',
  FORCA: 'Foco em força máxima com séries de 5-8 reps e cargas altas (80-85%).',
  POTENCIA: 'Foco explosivo com exercícios pliométricos e cargas altas.',
  RESISTENCIA: 'Foco em resistência muscular com exercícios intercalados.',
  METABOLICO: 'Circuitos de alta intensidade — exercícios compostos.',
  HIPERTROFIA_2: 'Variação II da hipertrofia — exercícios diferentes.',
  FORCA_2: 'Variação II da força — evitar platô.',
  RESISTENCIA_2: 'Variação II da resistência — novos desafios.',
  METABOLICO_2: 'Variação II do metabólico — novos circuitos.',
}

// Mapeamento de exercícios → regiões do corpo para avisos
const EXERCISE_REGION_MAP: { keywords: string[]; regions: string[] }[] = [
  { keywords: ['supino', 'press', 'desenvolvimento', 'fly', 'flexão de braço', 'chest'], regions: ['shoulder_left', 'shoulder_right', 'elbow_left', 'elbow_right'] },
  { keywords: ['agachamento', 'leg', 'afundo', 'búlgaro', 'subida box', 'lunge', 'squat'], regions: ['knee_left', 'knee_right', 'hip_left', 'hip_right', 'ankle_left', 'ankle_right'] },
  { keywords: ['remada', 'pulley', 'trx', 'puxada', 'pull'], regions: ['shoulder_left', 'shoulder_right', 'upper_back'] },
  { keywords: ['lombar', 'stiff', 'deadlift'], regions: ['lower_back'] },
  { keywords: ['prancha', 'ab ', 'core', 'rigidez', 'curl up'], regions: ['lower_back'] },
]

function getExerciseWarnings(exerciseName: string, painMap: Record<string, number>): string[] {
  const warnings: string[] = []
  const nameLower = exerciseName.toLowerCase()

  for (const mapping of EXERCISE_REGION_MAP) {
    if (mapping.keywords.some(kw => nameLower.includes(kw))) {
      for (const region of mapping.regions) {
        const painLevel = painMap[region]
        if (painLevel && painLevel >= 5) {
          const regionName = translatePainRegion(region)
          if (painLevel >= 8) {
            warnings.push(`🔴 ${regionName}: dor ${painLevel}/10 — alto risco`)
          } else {
            warnings.push(`⚠️ ${regionName}: dor ${painLevel}/10 — atenção`)
          }
        }
      }
    }
  }

  return warnings
}

// ============================================================================
// STEPS DO WIZARD
// ============================================================================

type Step = 'assessment' | 'objective' | 'phase' | 'mode' | 'edit' | 'config' | 'confirm'

const STEPS_AUTO: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'assessment', label: 'Avaliação', icon: <Activity className="h-4 w-4" /> },
  { key: 'objective', label: 'Objetivo', icon: <Target className="h-4 w-4" /> },
  { key: 'phase', label: 'Fase', icon: <Layers className="h-4 w-4" /> },
  { key: 'mode', label: 'Modo', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'config', label: 'Configurar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'confirm', label: 'Gerar', icon: <Zap className="h-4 w-4" /> },
]

const STEPS_MANUAL: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'assessment', label: 'Avaliação', icon: <Activity className="h-4 w-4" /> },
  { key: 'objective', label: 'Objetivo', icon: <Target className="h-4 w-4" /> },
  { key: 'phase', label: 'Fase', icon: <Layers className="h-4 w-4" /> },
  { key: 'mode', label: 'Modo', icon: <Settings2 className="h-4 w-4" /> },
  { key: 'edit', label: 'Montar', icon: <Pencil className="h-4 w-4" /> },
  { key: 'config', label: 'Configurar', icon: <Calendar className="h-4 w-4" /> },
  { key: 'confirm', label: 'Gerar', icon: <Zap className="h-4 w-4" /> },
]

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function GenerateWorkoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientIdParam = searchParams.get('clientId')
  const assessmentIdParam = searchParams.get('assessmentId')

  // State
  const [step, setStep] = useState<Step>('assessment')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto')

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

  // Assessment context (para avisos)
  const [assessmentContext, setAssessmentContext] = useState<AssessmentContext | null>(null)

  // Manual mode - editable template
  const [editableTreinos, setEditableTreinos] = useState<EditableTreino[]>([])
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  const STEPS = generationMode === 'manual' ? STEPS_MANUAL : STEPS_AUTO

  // ========================================================================
  // LOAD ASSESSMENTS
  // ========================================================================
  useEffect(() => {
    loadAvailableAssessments()
  }, [])

  useEffect(() => {
    if (assessmentIdParam && availableAssessments.length > 0) {
      const found = availableAssessments.find(a => a.id === assessmentIdParam)
      if (found) handleSelectAssessment(found)
    } else if (clientIdParam && availableAssessments.length > 0) {
      const found = availableAssessments.find(a => a.client.id === clientIdParam)
      if (found) handleSelectAssessment(found)
    }
  }, [assessmentIdParam, clientIdParam, availableAssessments])

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

    try {
      const objectiveParam = selectedObjective ? `&objective=${selectedObjective}` : ''
      const res = await fetch(`/api/studio/workouts/phases?clientId=${assessment.client.id}${objectiveParam}`)
      const data = await res.json()

      if (data.success) {
        setClientInfo(data.data.client)
        setPhases(data.data.phases)
        setObjectives(data.data.objectives)
        setAssessmentContext(data.data.assessmentContext)

        if (data.data.client.objective) {
          setSelectedObjective(data.data.client.objective)
        }
        // DON'T auto-advance — user clicks Próximo
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
    // DON'T auto-advance or reload phases here; goNext does it
  }

  // Called when advancing FROM objective step
  async function loadPhasesForObjective() {
    if (!selectedAssessment || !selectedObjective) return
    try {
      const res = await fetch(`/api/studio/workouts/phases?clientId=${selectedAssessment.client.id}&objective=${selectedObjective}`)
      const data = await res.json()
      if (data.success) {
        setPhases(data.data.phases)
        setAssessmentContext(data.data.assessmentContext)
        const recommended = data.data.phases.find((p: PhaseOption) => p.isRecommended)
        if (recommended) setSelectedPhase(recommended.value)
      }
    } catch (err) {
      console.error('Error reloading phases:', err)
    }
  }

  // ========================================================================
  // LOAD TEMPLATE FOR MANUAL EDITING
  // ========================================================================
  async function loadTemplateForEditing() {
    if (!selectedPhase || !selectedAssessment) return

    setLoadingTemplate(true)
    try {
      const res = await fetch(`/api/studio/workouts/template?clientId=${selectedAssessment.client.id}&phase=${selectedPhase}`)
      const data = await res.json()

      if (data.success && data.data.treinos) {
        // Adicionar warnings a cada exercício
        const treinos = data.data.treinos.map((treino: any) => ({
          ...treino,
          blocos: treino.blocos.map((bloco: any) => ({
            ...bloco,
            exercises: bloco.exercises.map((ex: any) => ({
              ...ex,
              _warnings: assessmentContext ? getExerciseWarnings(ex.name, assessmentContext.painMap) : [],
            })),
          })),
        }))
        setEditableTreinos(treinos)
      } else {
        setError('Template não encontrado para esta fase e nível')
      }
    } catch (err) {
      console.error('Error loading template:', err)
      setError('Erro ao carregar template')
    } finally {
      setLoadingTemplate(false)
    }
  }

  // ========================================================================
  // MANUAL EDIT HELPERS
  // ========================================================================
  function updateExercise(treinoIdx: number, blocoIdx: number, exIdx: number, field: string, value: string) {
    setEditableTreinos(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      updated[treinoIdx].blocos[blocoIdx].exercises[exIdx][field] = value
      // Recalculate warnings if name changed
      if (field === 'name' && assessmentContext) {
        updated[treinoIdx].blocos[blocoIdx].exercises[exIdx]._warnings =
          getExerciseWarnings(value, assessmentContext.painMap)
      }
      return updated
    })
  }

  function removeExercise(treinoIdx: number, blocoIdx: number, exIdx: number) {
    setEditableTreinos(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      updated[treinoIdx].blocos[blocoIdx].exercises.splice(exIdx, 1)
      // Remove empty blocks
      if (updated[treinoIdx].blocos[blocoIdx].exercises.length === 0) {
        updated[treinoIdx].blocos.splice(blocoIdx, 1)
      }
      return updated
    })
  }

  function addExercise(treinoIdx: number, blocoIdx: number) {
    setEditableTreinos(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      updated[treinoIdx].blocos[blocoIdx].exercises.push({
        name: '',
        reps: '',
        _warnings: [],
      })
      return updated
    })
  }

  function addBlock(treinoIdx: number) {
    setEditableTreinos(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const newBlockNum = updated[treinoIdx].blocos.length + 1
      updated[treinoIdx].blocos.push({
        name: `Bloco ${['I', 'II', 'III', 'IV', 'V'][newBlockNum - 1] || newBlockNum}`,
        exercises: [{ name: '', reps: '', _warnings: [] }],
      })
      return updated
    })
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
      const payload: any = {
        assessmentId: selectedAssessment.id,
        phase: selectedPhase,
        weeklyFrequency,
        notes,
        levelUp,
        mode: generationMode,
      }

      if (generationMode === 'manual' && editableTreinos.length > 0) {
        // Clean warnings before sending
        payload.customTemplate = {
          treinos: editableTreinos.map(t => ({
            ...t,
            blocos: t.blocos.map(b => ({
              ...b,
              exercises: b.exercises.map(({ _warnings, ...ex }) => ex),
            })),
          })),
        }
      }

      console.log('🚀 Generating workout v3:', payload)

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
    if (step === 'edit') {
      setStep('mode')
    } else if (step === 'config' && generationMode === 'manual') {
      setStep('edit')
    } else if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key)
    }
    setError(null)
  }

  async function goNext() {
    setError(null)
    if (step === 'assessment') {
      if (!selectedAssessment) { setError('Selecione uma avaliação'); return }
      // Data already loaded in handleSelectAssessment
      if (!clientInfo) { setError('Carregando dados do cliente...'); return }
      setStep('objective')
    } else if (step === 'objective') {
      if (!selectedObjective) { setError('Selecione um objetivo'); return }
      await loadPhasesForObjective()
      setStep('phase')
    } else if (step === 'phase') {
      if (!selectedPhase) { setError('Selecione uma fase'); return }
      setStep('mode')
    } else if (step === 'mode') {
      if (generationMode === 'manual') {
        await loadTemplateForEditing()
        setStep('edit')
      } else {
        setStep('config')
      }
    } else if (step === 'edit') {
      setStep('config')
    } else if (step === 'config') {
      setStep('confirm')
    }
  }

  // Can we proceed from the current step?
  function canGoNext(): boolean {
    if (step === 'assessment') return !!selectedAssessment && !!clientInfo
    if (step === 'objective') return !!selectedObjective
    if (step === 'phase') return !!selectedPhase
    if (step === 'mode') return true
    if (step === 'edit') return editableTreinos.length > 0
    if (step === 'config') return true
    return false
  }

  // ========================================================================
  // RENDER — Assessment Context Panel
  // ========================================================================
  function renderAssessmentPanel() {
    if (!assessmentContext) return null

    const painEntries = Object.entries(assessmentContext.painMap).filter(([_, v]) => v > 0)
    const lowScoreTests = Object.entries(assessmentContext.movementTests)
      .filter(([_, data]) => data.score <= 1)

    if (painEntries.length === 0 && assessmentContext.complaints.length === 0 && lowScoreTests.length === 0) {
      return null
    }

    return (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Contexto da Avaliação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Complaints */}
          {assessmentContext.complaints.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">🩹 Queixas:</p>
              <div className="flex flex-wrap gap-1">
                {assessmentContext.complaints.map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Pain Map */}
          {painEntries.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">📍 Dor:</p>
              <div className="flex flex-wrap gap-1">
                {painEntries.map(([region, level]) => (
                  <Badge
                    key={region}
                    className={`text-xs ${
                      level >= 8 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      level >= 5 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-muted text-muted-foreground'
                    }`}
                  >
                    {translatePainRegion(region)}: {level}/10
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Low Movement Scores */}
          {lowScoreTests.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">🏃 Testes com score baixo:</p>
              <div className="flex flex-wrap gap-1">
                {lowScoreTests.map(([test, data]) => (
                  <Badge key={test} className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                    {translateMovementPattern(test)}: {data.score}/3
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
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
              {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : s.icon}
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

      {/* Assessment Context Panel — always visible after step 1 */}
      {step !== 'assessment' && renderAssessmentPanel()}

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
                      </p>
                    </div>
                    {selectedAssessment?.id === a.id ? (
                      <CheckCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-end mt-6">
            <Button onClick={goNext} disabled={!canGoNext()} className="bg-amber-500 hover:bg-amber-600 text-white">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: SELECIONAR OBJETIVO */}
      {/* ================================================================== */}
      {step === 'objective' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Objetivo do Aluno</h2>

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
                    {selectedObjective === obj.value && (
                      <CheckCircle className="h-5 w-5 text-amber-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {OBJECTIVE_DESCRIPTIONS[obj.value] || ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button onClick={goNext} disabled={!canGoNext()} className="bg-amber-500 hover:bg-amber-600 text-white">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: SELECIONAR FASE */}
      {/* ================================================================== */}
      {step === 'phase' && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Selecione a Fase</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cada fase dura <span className="text-amber-500 font-semibold">6 semanas</span>.
          </p>

          <div className="grid gap-3">
            {phases.map((phase, i) => (
              <Card
                key={phase.value}
                className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                  selectedPhase === phase.value ? 'border-amber-500 bg-amber-500/5'
                    : phase.isRecommended ? 'border-amber-500/30' : ''
                }`}
                onClick={() => setSelectedPhase(phase.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        phase.isCurrent ? 'bg-green-500 text-white'
                          : phase.isRecommended ? 'bg-amber-500 text-white'
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
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Atual</Badge>
                      )}
                      {phase.isRecommended && (
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Recomendada</Badge>
                      )}
                      {selectedPhase === phase.value ? (
                        <CheckCircle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button onClick={goNext} disabled={!canGoNext()} className="bg-amber-500 hover:bg-amber-600 text-white">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: ESCOLHER MODO (AUTO/MANUAL) */}
      {/* ================================================================== */}
      {step === 'mode' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Modo de Criação</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Auto */}
            <Card
              className={`cursor-pointer transition-all hover:border-emerald-500/50 ${
                generationMode === 'auto' ? 'border-emerald-500 bg-emerald-500/5' : ''
              }`}
              onClick={() => setGenerationMode('auto')}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Automático</h3>
                <p className="text-sm text-muted-foreground">
                  Gera o treino completo automaticamente com base no template da fase.
                </p>
                {generationMode === 'auto' && (
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mt-3" />
                )}
              </CardContent>
            </Card>

            {/* Manual */}
            <Card
              className={`cursor-pointer transition-all hover:border-blue-500/50 ${
                generationMode === 'manual' ? 'border-blue-500 bg-blue-500/5' : ''
              }`}
              onClick={() => setGenerationMode('manual')}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Pencil className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Edite o template: troque, remova ou adicione exercícios.
                </p>
                {generationMode === 'manual' && (
                  <CheckCircle className="h-6 w-6 text-blue-500 mx-auto mt-3" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button onClick={goNext} className="bg-amber-500 hover:bg-amber-600 text-white">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5: EDIÇÃO MANUAL DE EXERCÍCIOS */}
      {/* ================================================================== */}
      {step === 'edit' && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Montar Treino</h2>

          <p className="text-sm text-muted-foreground mb-4">
            Edite os exercícios do template. Avisos ⚠️ indicam possíveis conflitos com a avaliação do aluno.
          </p>

          {loadingTemplate ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {editableTreinos.map((treino, tIdx) => (
                <Card key={tIdx} className="overflow-hidden">
                  <CardHeader className="bg-amber-500/10 py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-amber-500" />
                      {treino.pillarLabel}
                      <Badge variant="outline" className="ml-auto">{treino.series}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {treino.blocos.map((bloco, bIdx) => (
                      <div key={bIdx} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">{bloco.name}</h4>
                        {bloco.exercises.map((ex, eIdx) => (
                          <div key={eIdx} className="space-y-1">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5 shrink-0" />
                              <div className="flex-1 grid grid-cols-[1fr_auto_auto] gap-2">
                                <Input
                                  value={ex.name}
                                  onChange={(e) => updateExercise(tIdx, bIdx, eIdx, 'name', e.target.value)}
                                  placeholder="Nome do exercício"
                                  className="text-sm"
                                />
                                <Input
                                  value={ex.reps}
                                  onChange={(e) => updateExercise(tIdx, bIdx, eIdx, 'reps', e.target.value)}
                                  placeholder="Reps"
                                  className="text-sm w-24"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => removeExercise(tIdx, bIdx, eIdx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {/* Warnings */}
                            {ex._warnings && ex._warnings.length > 0 && (
                              <div className="ml-6 space-y-0.5">
                                {ex._warnings.map((w, wIdx) => (
                                  <p key={wIdx} className={`text-xs ${
                                    w.startsWith('🔴') ? 'text-red-400' : 'text-amber-400'
                                  }`}>
                                    {w}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-6 text-xs text-muted-foreground"
                          onClick={() => addExercise(tIdx, bIdx)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Adicionar exercício
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => addBlock(tIdx)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Bloco
                    </Button>

                    {treino.protocoloFinal && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        <span className="font-medium">Protocolo Final:</span> {treino.protocoloFinal}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Navigation */}
              <div className="flex justify-between mt-2">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={goNext}
                  disabled={editableTreinos.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP: CONFIGURAR FREQUÊNCIA */}
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
                  <p className="text-xs text-muted-foreground mb-1">Fase • Modo</p>
                  <p className="font-medium text-amber-500 text-sm">
                    {phases.find(p => p.value === selectedPhase)?.label}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {generationMode === 'auto' ? '🤖 Auto' : '✏️ Manual'}
                  </Badge>
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

          {/* Navigation */}
          <div className="flex justify-between mt-2">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={goNext}
            >
              Revisar e Gerar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP: CONFIRMAR E GERAR */}
      {/* ================================================================== */}
      {step === 'confirm' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Confirmar Geração</h2>

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
                  <span className="text-muted-foreground">Modo</span>
                  <Badge className={generationMode === 'manual' ? 'bg-blue-500' : 'bg-emerald-500'}>
                    {generationMode === 'auto' ? '🤖 Automático' : '✏️ Manual'}
                  </Badge>
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

              {generationMode === 'manual' && editableTreinos.length > 0 && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400 font-medium mb-1">Template Personalizado:</p>
                  <div className="space-y-1">
                    {editableTreinos.map((t, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {t.pillarLabel}: {t.blocos.reduce((acc, b) => acc + b.exercises.length, 0)} exercícios
                      </p>
                    ))}
                  </div>
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
