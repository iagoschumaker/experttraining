// ============================================================================
// EXPERT PRO TRAINING - GENERATE WORKOUT PAGE v3
// ============================================================================
// Fluxo: Avaliação → Objetivo → Fase → Modo (Auto/Manual) → [Editar] → Gerar
// ============================================================================

'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
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
  Search,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FlameKindling,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { translatePainRegion, translateMovementPattern } from '@/lib/translations'
import {
  getExercisesForPosition,
  POSITION_LABELS,
  PREP_EXERCISES,
  FINAL_PROTOCOL_OPTIONS,
  ExerciseCatalogEntry,
} from '@/lib/exerciseCatalog'

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
  rest?: string
  weeklyReps?: string[]
  weeklyLoad?: string[]
  _warnings?: string[]
}

interface EditablePrepExercise {
  name: string
  detail: string
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
  editablePrep?: EditablePrepExercise[]
  prepTitle?: string
}

// ============================================================================
// CONSTANTES E HELPERS
// ============================================================================

const OBJECTIVE_ICONS: Record<string, string> = {
  EMAGRECIMENTO: '🔥',
  HIPERTROFIA_OBJ: '💪',
  PERFORMANCE: '⚡',
  REABILITACAO: '🏥',
  GESTANTE: '🤰',
}

const OBJECTIVE_DESCRIPTIONS: Record<string, string> = {
  EMAGRECIMENTO: 'Foco em queima de gordura com fases de condicionamento, força, resistência e metabólico',
  HIPERTROFIA_OBJ: 'Foco em ganho muscular com fases de condicionamento, força e hipertrofia progressiva',
  PERFORMANCE: 'Foco em desempenho esportivo com fases de condicionamento, força, potência e resistência',
  REABILITACAO: 'Foco em recuperação e saúde com fases de condicionamento e força',
  GESTANTE: 'Protocolo adaptado por trimestre — sessões full-body, FC máx 140bpm, foco em manutenção de tônus e assoalho pélvico',
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
  GESTANTE_T1: '1º trimestre (1-12 sem) — adaptação, controle FC, fortalecimento pélvico.',
  GESTANTE_T2: '2º trimestre (13-27 sem) — manutenção de força, equilíbrio, respiração.',
  GESTANTE_T3_A: '3º trimestre (28-35 sem) — redução de carga, mobilidade, relaxamento.',
  GESTANTE_T3_B: 'Pré-Parto (36-42 sem) — preparação para o parto, alongamento suave.',
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
  const [gestationalWeek, setGestationalWeek] = useState<number | null>(null)

  // Assessment search
  const [assessmentSearch, setAssessmentSearch] = useState('')


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
        const preparations: any[] = data.data.preparations || []
        // Adicionar warnings a cada exercício + preparação editável por treino
        const treinos = data.data.treinos.map((treino: any, tIdx: number) => {
          const prep = preparations[tIdx % Math.max(preparations.length, 1)] || preparations[0]
          return {
            ...treino,
            blocos: treino.blocos.map((bloco: any) => ({
              ...bloco,
              exercises: bloco.exercises.map((ex: any) => ({
                ...ex,
                rest: ex.rest || '',
                _warnings: assessmentContext ? getExerciseWarnings(ex.name, assessmentContext.painMap) : [],
              })),
            })),
            editablePrep: prep
              ? (prep.exercises || []).map((ex: any) => ({ name: ex.name || '', detail: ex.detail || '' }))
              : [],
            prepTitle: prep?.title || `Preparação ${tIdx + 1}`,
          }
        })
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
        objective: selectedObjective || undefined,
        gestationalWeek: (selectedObjective === 'GESTANTE' && gestationalWeek) ? gestationalWeek : undefined,
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
    } else if (step === 'mode' && selectedObjective === 'GESTANTE') {
      // Skip phase step when going back for gestante
      setStep('objective')
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
      if (selectedObjective === 'GESTANTE') {
        // Auto-determine phase from gestational week and skip phase step
        if (!gestationalWeek) { setError('Informe a semana gestacional'); return }
        const autoPhase = gestationalWeek <= 12 ? 'GESTANTE_T1'
          : gestationalWeek <= 27 ? 'GESTANTE_T2'
          : gestationalWeek <= 35 ? 'GESTANTE_T3_A'
          : 'GESTANTE_T3_B'
        setSelectedPhase(autoPhase)
        // Skip phase step, go directly to mode
        setStep('mode')
      } else {
        await loadPhasesForObjective()
        setStep('phase')
      }
    } else if (step === 'phase') {
      if (!selectedPhase) { setError('Selecione uma fase'); return }
      setStep('mode')
    } else if (step === 'mode') {
      if (generationMode === 'manual') {
        await loadTemplateForEditing()
        setStep('edit')
      } else {
        // Auto-set frequency for gestante
        if (selectedObjective === 'GESTANTE') {
          setWeeklyFrequency(selectedPhase === 'GESTANTE_T3_B' ? 2 : 3)
        }
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
    if (step === 'objective') return !!selectedObjective && (selectedObjective !== 'GESTANTE' || !!gestationalWeek)
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

      {/* STEP 1: SELECIONAR AVALIAÇÃO */}
      {/* ================================================================== */}
      {step === 'assessment' && (() => {
        const filtered = availableAssessments.filter(a => {
          if (!assessmentSearch) return true
          const q = assessmentSearch.toLowerCase()
          const name = (a.client?.name || '').toLowerCase()
          const date = new Date(a.createdAt).toLocaleDateString('pt-BR')
          return name.includes(q) || date.includes(q)
        })
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Selecione a Avaliação</h2>
              <p className="text-sm text-muted-foreground">Busque pelo nome do aluno ou data da avaliação</p>
            </div>

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
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={assessmentSearch}
                    onChange={e => setAssessmentSearch(e.target.value)}
                    placeholder="Pesquisar por nome ou data..."
                    className="pl-10 h-11 text-sm"
                    autoFocus
                  />
                  {assessmentSearch && (
                    <button
                      onClick={() => setAssessmentSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Count */}
                <p className="text-xs text-muted-foreground">
                  {filtered.length} avaliação{filtered.length !== 1 ? 'ões' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
                  {assessmentSearch && ` para "${assessmentSearch}"`}
                </p>

                {/* Selected assessment summary */}
                {selectedAssessment && (
                  <div className="border border-amber-500/40 bg-amber-500/5 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedAssessment.client.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(selectedAssessment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(selectedAssessment.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs shrink-0">Selecionada</Badge>
                  </div>
                )}

                {/* Results list */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma avaliação encontrada
                    </div>
                  ) : (
                    filtered.map((a) => {
                      const isSelected = selectedAssessment?.id === a.id
                      const rawLevel = a.resultJson?.level || a.resultJson?.fitnessLevel || a.resultJson?.nivelAtual || ''
                      // resultJson.level can be an object in some older assessments — cast to string
                      const level = String(typeof rawLevel === 'object' ? (rawLevel as any)?.value || '' : rawLevel).toUpperCase()
                      const levelLabel = level.includes('BEGIN') || level.includes('INIC') ? 'Iniciante'
                        : level.includes('INTER') ? 'Intermediário'
                        : level.includes('ADV') || level.includes('AVAN') ? 'Avançado'
                        : ''
                      const levelColor = level.includes('BEGIN') || level.includes('INIC') ? 'bg-green-500/20 text-green-400'
                        : level.includes('INTER') ? 'bg-blue-500/20 text-blue-400'
                        : level.includes('ADV') || level.includes('AVAN') ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-muted text-muted-foreground'


                      return (
                        <button
                          key={a.id}
                          onClick={() => handleSelectAssessment(a)}
                          className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:border-amber-500/50 hover:bg-amber-500/5 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-amber-500' : 'bg-muted'
                              }`}>
                                {isSelected
                                  ? <CheckCircle className="h-4 w-4 text-white" />
                                  : <User className="h-4 w-4 text-muted-foreground" />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{a.client.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(a.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {levelLabel && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${levelColor}`}>
                                  {levelLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
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
        )
      })()}



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

          {/* Gestante extra fields */}
          {selectedObjective === 'GESTANTE' && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-pink-600 dark:text-pink-400 mb-3 flex items-center gap-2">
                  🤰 Informações da Gestação
                </h4>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Semana gestacional atual
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={42}
                    value={gestationalWeek || ''}
                    onChange={(e) => setGestationalWeek(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Ex: 16"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                  {gestationalWeek && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {gestationalWeek <= 12 ? '1º Trimestre — Fase de adaptação' :
                       gestationalWeek <= 27 ? '2º Trimestre — Manutenção e equilíbrio' :
                       gestationalWeek <= 35 ? '3º Trimestre — Redução gradual' :
                       'Pré-Parto — Preparação para o parto'}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400">⚠️ Regras de Segurança</p>
                <p className="text-muted-foreground">• FC máxima: 140 bpm (teste da fala)</p>
                <p className="text-muted-foreground">• Temperatura corporal {'<'} 38.5°C</p>
                <p className="text-muted-foreground">• 30-40 min por sessão, esforço leve a moderado</p>
                <p className="text-muted-foreground">• Evitar movimentos balísticos e grandes amplitudes</p>
                <p className="text-muted-foreground">• Liberação médica obrigatória</p>
              </div>
            </div>
          )}

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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold">Montar Treino</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Personalize cada exercício. Selects filtrados por posição e foco do treino.
              </p>
            </div>
          </div>

          {loadingTemplate ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Carregando template...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {editableTreinos.map((treino, tIdx) => {
                const pillarColor = treino.pillar === 'PERNA'
                  ? 'from-amber-500/15 to-amber-600/5 border-amber-500/30'
                  : treino.pillar === 'EMPURRA'
                  ? 'from-blue-500/15 to-blue-600/5 border-blue-500/30'
                  : 'from-purple-500/15 to-purple-600/5 border-purple-500/30'
                const pillarAccent = treino.pillar === 'PERNA' ? 'text-amber-400 bg-amber-500'
                  : treino.pillar === 'EMPURRA' ? 'text-blue-400 bg-blue-500'
                  : 'text-purple-400 bg-purple-500'
                const pillarTextAccent = treino.pillar === 'PERNA' ? 'text-amber-400'
                  : treino.pillar === 'EMPURRA' ? 'text-blue-400' : 'text-purple-400'
                const pillarEmoji = treino.pillar === 'PERNA' ? '🦵' : treino.pillar === 'EMPURRA' ? '💪' : '🔙'

                return (
                  <div key={tIdx} className={`rounded-2xl border bg-gradient-to-br ${pillarColor} overflow-hidden`}>
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${pillarAccent} flex items-center justify-center text-white text-lg font-bold`}>
                        {pillarEmoji}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{treino.pillarLabel}</h3>
                        <p className="text-xs text-muted-foreground">Séries: {treino.series}</p>
                      </div>
                      <Badge variant="outline" className={`${pillarTextAccent} border-current text-xs`}>{treino.pillar}</Badge>
                    </div>

                    <div className="px-5 pb-5 space-y-5">

                      {/* ====== PREPARAÇÃO ====== */}
                      <div className="rounded-xl bg-background/60 border border-border/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
                          <FlameKindling className="h-4 w-4 text-orange-400" />
                          <span className="text-sm font-semibold">Preparação — {treino.prepTitle || `Preparação ${tIdx + 1}`}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">Aquecimento</Badge>
                        </div>
                        <div className="p-3 space-y-2">
                          {(treino.editablePrep || []).map((prepEx, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-[1fr_auto] gap-2">
                                {/* Exercise name select */}
                                <div className="relative">
                                  <select
                                    value={prepEx.name}
                                    onChange={e => {
                                      setEditableTreinos(prev => {
                                        const u = JSON.parse(JSON.stringify(prev))
                                        u[tIdx].editablePrep[pIdx].name = e.target.value
                                        return u
                                      })
                                    }}
                                    className="w-full h-8 pl-2 pr-6 rounded-lg border border-border bg-background text-xs appearance-none"
                                  >
                                    <option value="">Selecionar exercício...</option>
                                    {PREP_EXERCISES.map(name => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                    {prepEx.name && !PREP_EXERCISES.includes(prepEx.name) && (
                                      <option value={prepEx.name}>{prepEx.name}</option>
                                    )}
                                  </select>
                                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                </div>
                                <Input
                                  value={prepEx.detail}
                                  onChange={e => {
                                    setEditableTreinos(prev => {
                                      const u = JSON.parse(JSON.stringify(prev))
                                      u[tIdx].editablePrep[pIdx].detail = e.target.value
                                      return u
                                    })
                                  }}
                                  placeholder="Detalhe..."
                                  className="h-8 text-xs w-28"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setEditableTreinos(prev => {
                                    const u = JSON.parse(JSON.stringify(prev))
                                    u[tIdx].editablePrep.splice(pIdx, 1)
                                    return u
                                  })
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setEditableTreinos(prev => {
                                const u = JSON.parse(JSON.stringify(prev))
                                if (!u[tIdx].editablePrep) u[tIdx].editablePrep = []
                                u[tIdx].editablePrep.push({ name: '', detail: '' })
                                return u
                              })
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 ml-0.5 transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Adicionar exercício de preparação
                          </button>
                        </div>
                      </div>

                      {/* ====== BLOCOS ====== */}
                      {treino.blocos.map((bloco, bIdx) => (
                        <div key={bIdx} className="rounded-xl bg-background/60 border border-border/50 overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
                            <Dumbbell className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-semibold">{bloco.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{treino.series} · {bloco.exercises.length} exercício(s)</span>
                          </div>
                          <div className="p-3 space-y-3">
                            {bloco.exercises.map((ex, eIdx) => {
                              const posIdx = Math.min(eIdx, 2) as 0 | 1 | 2
                              const posInfo = POSITION_LABELS[posIdx]
                              const catalogOptions = getExercisesForPosition(posIdx, treino.pillar)
                              const warnings = ex._warnings || []
                              const hasHighRisk = warnings.some(w => w.startsWith('🔴'))
                              const hasWarning = warnings.some(w => w.startsWith('⚠️'))

                              return (
                                <div key={eIdx} className="space-y-1.5">
                                  {/* Position label */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{posInfo.icon}</span>
                                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${posInfo.color}`}>
                                      {eIdx + 1}º — {posInfo.label}
                                    </span>
                                    {hasHighRisk && (
                                      <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Shield className="h-2.5 w-2.5" /> Alto Risco
                                      </span>
                                    )}
                                    {!hasHighRisk && hasWarning && (
                                      <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <AlertTriangle className="h-2.5 w-2.5" /> Atenção
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 space-y-1.5">
                                      {/* Exercise name select */}
                                      <div className="relative">
                                        <select
                                          value={ex.name}
                                          onChange={e => updateExercise(tIdx, bIdx, eIdx, 'name', e.target.value)}
                                          className={`w-full h-9 pl-2 pr-7 rounded-lg border bg-background text-sm appearance-none transition-colors ${
                                            hasHighRisk
                                              ? 'border-red-500/40 bg-red-500/5'
                                              : hasWarning
                                              ? 'border-amber-500/40 bg-amber-500/5'
                                              : 'border-border'
                                          }`}
                                        >
                                          <option value="">Selecionar exercício...</option>
                                          <optgroup label={`Sugeridos para posição ${eIdx + 1}`}>
                                            {catalogOptions.map(opt => (
                                              <option key={opt.name} value={opt.name}>{opt.name}</option>
                                            ))}
                                          </optgroup>
                                          {ex.name && !catalogOptions.find(o => o.name === ex.name) && (
                                            <optgroup label="Atual">
                                              <option value={ex.name}>{ex.name}</option>
                                            </optgroup>
                                          )}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                      </div>

                                      {/* Reps + Rest row */}
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <Input
                                          value={ex.reps}
                                          onChange={e => updateExercise(tIdx, bIdx, eIdx, 'reps', e.target.value)}
                                          placeholder="Reps (ex: 12 reps)"
                                          className="h-7 text-xs"
                                        />
                                        <Input
                                          value={ex.rest || ''}
                                          onChange={e => updateExercise(tIdx, bIdx, eIdx, 'rest', e.target.value)}
                                          placeholder="Descanso (ex: 60s)"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    </div>

                                    {/* Remove button */}
                                    <button
                                      onClick={() => removeExercise(tIdx, bIdx, eIdx)}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors shrink-0 mt-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Warnings */}
                                  {warnings.length > 0 && (
                                    <div className="ml-0 space-y-0.5 bg-background/80 rounded-lg px-3 py-2 border border-border/50">
                                      {warnings.map((w, wIdx) => (
                                        <p key={wIdx} className={`text-xs flex items-start gap-1 ${
                                          w.startsWith('🔴') ? 'text-red-400' : 'text-amber-400'
                                        }`}>
                                          {w}
                                        </p>
                                      ))}
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        O personal pode manter o exercício — isso é apenas um aviso.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            <button
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 transition-colors"
                              onClick={() => addExercise(tIdx, bIdx)}
                            >
                              <Plus className="h-3 w-3" /> Adicionar exercício
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        className="w-full h-10 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center justify-center gap-2 transition-colors"
                        onClick={() => addBlock(tIdx)}
                      >
                        <Plus className="h-4 w-4" /> Adicionar Bloco
                      </button>

                      {/* ====== PROTOCOLO FINAL ====== */}
                      <div className="rounded-xl bg-background/60 border border-border/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
                          <Zap className="h-4 w-4 text-amber-400" />
                          <span className="text-sm font-semibold">Protocolo Final</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">6-8 min</Badge>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="relative">
                            <select
                              value={treino.protocoloFinal || ''}
                              onChange={e => {
                                setEditableTreinos(prev => {
                                  const u = JSON.parse(JSON.stringify(prev))
                                  u[tIdx].protocoloFinal = e.target.value
                                  return u
                                })
                              }}
                              className="w-full h-9 pl-2 pr-7 rounded-lg border border-border bg-background text-sm appearance-none"
                            >
                              <option value="">Nenhum protocolo</option>
                              {FINAL_PROTOCOL_OPTIONS.filter(Boolean).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                              {treino.protocoloFinal && !FINAL_PROTOCOL_OPTIONS.includes(treino.protocoloFinal) && (
                                <option value={treino.protocoloFinal}>{treino.protocoloFinal}</option>
                              )}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                          <Input
                            value={treino.protocoloFinal || ''}
                            onChange={e => {
                              setEditableTreinos(prev => {
                                const u = JSON.parse(JSON.stringify(prev))
                                u[tIdx].protocoloFinal = e.target.value
                                return u
                              })
                            }}
                            placeholder="Ou escreva um protocolo personalizado..."
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}

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

          {/* Frequency — hidden for GESTANTE (auto-determined by trimester) */}
          {selectedObjective !== 'GESTANTE' ? (
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
          ) : (
            <Card className="mb-6 border-pink-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤰</span>
                  <div>
                    <p className="font-medium text-foreground">Frequência definida pelo trimestre</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPhase === 'GESTANTE_T3_B' ? '2x por semana (pré-parto)' : '3x por semana'}
                      {' '} • Sessões de {selectedPhase === 'GESTANTE_T3_B' ? '25' : selectedPhase === 'GESTANTE_T3_A' ? '30' : '35'} min
                    </p>
                    {gestationalWeek && (
                      <p className="text-xs text-pink-500 mt-1">
                        Semana gestacional: {gestationalWeek}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Level Up — hidden for GESTANTE */}
          {selectedObjective !== 'GESTANTE' && clientInfo?.level !== 'AVANCADO' && (
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
