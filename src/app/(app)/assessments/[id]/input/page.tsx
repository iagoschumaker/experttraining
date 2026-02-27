'use client'

// ============================================================================
// EXPERT TRAINING - ASSESSMENT INPUT PAGE
// ============================================================================
// Formulário completo de avaliação: Queixas, Mapa de Dor, Testes de Movimento
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Play,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Calculator,
} from 'lucide-react'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { SkinfoldsInput, PollockResult } from '@/services/pollock'

// Types
interface MovementTest {
  score: number
  observations: string
}

interface AssessmentInput {
  complaints: string[]
  painMap: Record<string, number>
  movementTests: {
    squat: MovementTest
    hinge: MovementTest
    lunge: MovementTest
    push: MovementTest
    pull: MovementTest
    rotation: MovementTest
    gait: MovementTest
  }
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

// Body metrics interface (optional)
interface BodyMetrics {
  weight?: number
  height?: number
  bodyFat?: number
  measurements?: {
    chest?: number
    waist?: number
    abdomen?: number
    hip?: number
    forearm_right?: number
    forearm_left?: number
    arm_right?: number
    arm_left?: number
    thigh_right?: number
    thigh_left?: number
    calf_right?: number
    calf_left?: number
  }
  skinfolds?: {
    chest?: number
    abdomen?: number
    thigh?: number
    triceps?: number
    suprailiac?: number
    subscapular?: number
    midaxillary?: number
  }
  notes?: string
}

interface Assessment {
  id: string
  status: string
  inputJson: AssessmentInput | null
  client: {
    id: string
    name: string
    history: string | null
    objectives: string | null
    gender: string | null
    birthDate: string | null
    weight: number | null
  }
}

// Pain map body regions
const BODY_REGIONS = [
  { id: 'neck', label: 'Pescoço' },
  { id: 'shoulder_left', label: 'Ombro Esquerdo' },
  { id: 'shoulder_right', label: 'Ombro Direito' },
  { id: 'upper_back', label: 'Parte Superior das Costas' },
  { id: 'lower_back', label: 'Lombar' },
  { id: 'hip_left', label: 'Quadril Esquerdo' },
  { id: 'hip_right', label: 'Quadril Direito' },
  { id: 'knee_left', label: 'Joelho Esquerdo' },
  { id: 'knee_right', label: 'Joelho Direito' },
  { id: 'ankle_left', label: 'Tornozelo Esquerdo' },
  { id: 'ankle_right', label: 'Tornozelo Direito' },
  { id: 'elbow_left', label: 'Cotovelo Esquerdo' },
  { id: 'elbow_right', label: 'Cotovelo Direito' },
  { id: 'wrist_left', label: 'Punho Esquerdo' },
  { id: 'wrist_right', label: 'Punho Direito' },
]

// Movement tests config
const MOVEMENT_TESTS = [
  {
    id: 'squat',
    name: 'Agachamento',
    description: 'Avalie a qualidade do agachamento profundo',
  },
  {
    id: 'hinge',
    name: 'Hinge (Dobradiça)',
    description: 'Avalie o padrão de dobradiça de quadril',
  },
  {
    id: 'lunge',
    name: 'Lunge (Avanço)',
    description: 'Avalie o padrão de avanço unilateral',
  },
  {
    id: 'push',
    name: 'Empurrar',
    description: 'Avalie o padrão de empurrar (flexão)',
  },
  {
    id: 'pull',
    name: 'Puxar',
    description: 'Avalie o padrão de puxar',
  },
  {
    id: 'rotation',
    name: 'Rotação',
    description: 'Avalie a capacidade rotacional do tronco',
  },
  {
    id: 'gait',
    name: 'Marcha',
    description: 'Avalie o padrão de caminhada/corrida',
  },
] as const

const SCORE_LABELS = [
  { value: 0, label: 'Incapaz', color: 'bg-red-500' },
  { value: 1, label: 'Com Compensação', color: 'bg-orange-500' },
  { value: 2, label: 'Aceitável', color: 'bg-yellow-500' },
  { value: 3, label: 'Excelente', color: 'bg-green-500' },
]

// Common complaints
const COMMON_COMPLAINTS = [
  'Dor lombar',
  'Dor no joelho',
  'Dor no ombro',
  'Dor cervical',
  'Falta de mobilidade',
  'Fraqueza muscular',
  'Desequilíbrio',
  'Fadiga excessiva',
  'Dificuldade respiratória',
  'Tensão muscular',
]

export default function AssessmentInputPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState(1) // 1: Complaints, 2: Pain Map, 3: Movement Tests, 4: Body Metrics, 5: Level
  const [newComplaint, setNewComplaint] = useState('')

  // Form state
  const [formData, setFormData] = useState<AssessmentInput>({
    complaints: [],
    painMap: {},
    movementTests: {
      squat: { score: 0, observations: '' },
      hinge: { score: 0, observations: '' },
      lunge: { score: 0, observations: '' },
      push: { score: 0, observations: '' },
      pull: { score: 0, observations: '' },
      rotation: { score: 0, observations: '' },
      gait: { score: 0, observations: '' },
    },
    level: 'BEGINNER',
  })

  // Body metrics (optional)
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics>({
    weight: undefined,
    height: undefined,
    bodyFat: undefined,
    measurements: {},
    skinfolds: {},
    notes: '',
  })

  // Fetch assessment
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await fetch(`/api/assessments/${assessmentId}`)
        const data = await res.json()

        if (data.success) {
          setAssessment(data.data)
          if (data.data.inputJson) {
            setFormData(data.data.inputJson)
          }
        } else {
          alert('Avaliação não encontrada')
          router.push('/assessments')
        }
      } catch (error) {
        console.error('Error fetching assessment:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessment()
  }, [assessmentId, router])

  // Add complaint
  const addComplaint = (complaint: string) => {
    if (complaint && !formData.complaints.includes(complaint)) {
      setFormData({
        ...formData,
        complaints: [...formData.complaints, complaint],
      })
    }
    setNewComplaint('')
  }

  // Remove complaint
  const removeComplaint = (complaint: string) => {
    setFormData({
      ...formData,
      complaints: formData.complaints.filter((c) => c !== complaint),
    })
  }

  // Update pain level
  const updatePainLevel = (region: string, level: number) => {
    setFormData({
      ...formData,
      painMap: {
        ...formData.painMap,
        [region]: level,
      },
    })
  }

  // Update movement test
  const updateMovementTest = (
    test: keyof AssessmentInput['movementTests'],
    field: 'score' | 'observations',
    value: number | string
  ) => {
    setFormData({
      ...formData,
      movementTests: {
        ...formData.movementTests,
        [test]: {
          ...formData.movementTests[test],
          [field]: value,
        },
      },
    })
  }

  // Save progress
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputJson: formData,
          status: 'IN_PROGRESS',
        }),
      })

      const data = await res.json()

      if (!data.success) {
        alert(data.error || 'Erro ao salvar')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Process assessment
  const handleProcess = async () => {
    setProcessing(true)
    try {
      // First save the data with bodyMetrics
      // Filter out empty values from bodyMetrics
      const cleanBodyMetrics: BodyMetrics = {}
      if (bodyMetrics.weight) cleanBodyMetrics.weight = bodyMetrics.weight
      if (bodyMetrics.height) cleanBodyMetrics.height = bodyMetrics.height
      if (bodyMetrics.bodyFat) cleanBodyMetrics.bodyFat = bodyMetrics.bodyFat
      if (bodyMetrics.notes) cleanBodyMetrics.notes = bodyMetrics.notes
      if (bodyMetrics.measurements) {
        const measurements: BodyMetrics['measurements'] = {}
        if (bodyMetrics.measurements.chest) measurements.chest = bodyMetrics.measurements.chest
        if (bodyMetrics.measurements.waist) measurements.waist = bodyMetrics.measurements.waist
        if (bodyMetrics.measurements.abdomen) measurements.abdomen = bodyMetrics.measurements.abdomen
        if (bodyMetrics.measurements.hip) measurements.hip = bodyMetrics.measurements.hip
        if (bodyMetrics.measurements.forearm_right) measurements.forearm_right = bodyMetrics.measurements.forearm_right
        if (bodyMetrics.measurements.forearm_left) measurements.forearm_left = bodyMetrics.measurements.forearm_left
        if (bodyMetrics.measurements.arm_right) measurements.arm_right = bodyMetrics.measurements.arm_right
        if (bodyMetrics.measurements.arm_left) measurements.arm_left = bodyMetrics.measurements.arm_left
        if (bodyMetrics.measurements.thigh_right) measurements.thigh_right = bodyMetrics.measurements.thigh_right
        if (bodyMetrics.measurements.thigh_left) measurements.thigh_left = bodyMetrics.measurements.thigh_left
        if (bodyMetrics.measurements.calf_right) measurements.calf_right = bodyMetrics.measurements.calf_right
        if (bodyMetrics.measurements.calf_left) measurements.calf_left = bodyMetrics.measurements.calf_left
        if (Object.keys(measurements).length > 0) {
          cleanBodyMetrics.measurements = measurements
        }
      }
      if (bodyMetrics.skinfolds) {
        const skinfolds: BodyMetrics['skinfolds'] = {}
        if (bodyMetrics.skinfolds.chest) skinfolds.chest = bodyMetrics.skinfolds.chest
        if (bodyMetrics.skinfolds.abdomen) skinfolds.abdomen = bodyMetrics.skinfolds.abdomen
        if (bodyMetrics.skinfolds.thigh) skinfolds.thigh = bodyMetrics.skinfolds.thigh
        if (bodyMetrics.skinfolds.triceps) skinfolds.triceps = bodyMetrics.skinfolds.triceps
        if (bodyMetrics.skinfolds.suprailiac) skinfolds.suprailiac = bodyMetrics.skinfolds.suprailiac
        if (bodyMetrics.skinfolds.subscapular) skinfolds.subscapular = bodyMetrics.skinfolds.subscapular
        if (bodyMetrics.skinfolds.midaxillary) skinfolds.midaxillary = bodyMetrics.skinfolds.midaxillary
        if (Object.keys(skinfolds).length > 0) {
          cleanBodyMetrics.skinfolds = skinfolds
        }
      }

      await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputJson: formData,
          bodyMetrics: Object.keys(cleanBodyMetrics).length > 0 ? cleanBodyMetrics : undefined,
        }),
      })

      // Then process
      const res = await fetch(`/api/assessments/${assessmentId}/process`, {
        method: 'POST',
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/assessments/${assessmentId}`)
      } else {
        alert(data.error || 'Erro ao processar avaliação')
      }
    } catch (error) {
      console.error('Error processing:', error)
      alert('Erro ao processar avaliação')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!assessment) {
    return null
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assessments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Avaliação: {assessment.client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados da avaliação funcional
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
      </div>

      {/* Client info */}
      {(assessment.client.history || assessment.client.objectives) && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {assessment.client.objectives && (
                <div>
                  <Label className="text-muted-foreground">Objetivos</Label>
                  <p className="mt-1">{assessment.client.objectives}</p>
                </div>
              )}
              {assessment.client.history && (
                <div>
                  <Label className="text-muted-foreground">Histórico</Label>
                  <p className="mt-1">{assessment.client.history}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              step === s
                ? 'bg-amber-500 text-white'
                : step > s
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step > s ? <CheckCircle className="h-5 w-5" /> : s}
          </button>
        ))}
      </div>
      <div className="text-center text-sm text-gray-500">
        {step === 1 && 'Etapa 1: Queixas do Cliente'}
        {step === 2 && 'Etapa 2: Mapa de Dor'}
        {step === 3 && 'Etapa 3: Testes de Movimento'}
        {step === 4 && 'Etapa 4: Medidas Corporais (Opcional)'}
        {step === 5 && 'Etapa 5: Nível e Processamento'}
      </div>

      {/* Step 1: Complaints */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Queixas do Cliente</CardTitle>
            <CardDescription>
              Registre as queixas e sintomas relatados pelo cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected complaints */}
            <div className="flex flex-wrap gap-2">
              {formData.complaints.map((complaint) => (
                <Badge key={complaint} variant="secondary" className="gap-1 py-1">
                  {complaint}
                  <button
                    onClick={() => removeComplaint(complaint)}
                    className="ml-1 rounded-full hover:bg-gray-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {formData.complaints.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma queixa registrada
                </p>
              )}
            </div>

            {/* Common complaints */}
            <div>
              <Label className="mb-2 block">Queixas Comuns</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_COMPLAINTS.filter(
                  (c) => !formData.complaints.includes(c)
                ).map((complaint) => (
                  <Button
                    key={complaint}
                    variant="outline"
                    size="sm"
                    onClick={() => addComplaint(complaint)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {complaint}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom complaint */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar outra queixa..."
                value={newComplaint}
                onChange={(e) => setNewComplaint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addComplaint(newComplaint)
                  }
                }}
              />
              <Button onClick={() => addComplaint(newComplaint)}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pain Map */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Dor</CardTitle>
            <CardDescription>
              Indique a intensidade da dor em cada região (0 = sem dor, 10 = dor
              extrema)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BODY_REGIONS.map((region) => (
                <div key={region.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{region.label}</Label>
                    <span
                      className={`text-sm font-medium ${
                        (formData.painMap[region.id] || 0) === 0
                          ? 'text-green-600'
                          : (formData.painMap[region.id] || 0) <= 3
                          ? 'text-yellow-600'
                          : (formData.painMap[region.id] || 0) <= 6
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formData.painMap[region.id] || 0}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.painMap[region.id] || 0}
                    onChange={(e) =>
                      updatePainLevel(region.id, parseInt(e.target.value))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-border"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Movement Tests */}
      {step === 3 && (
        <div className="space-y-4">
          {MOVEMENT_TESTS.map((test) => (
            <Card key={test.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Pontuação</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SCORE_LABELS.map((score) => (
                      <button
                        key={score.value}
                        onClick={() =>
                          updateMovementTest(
                            test.id as keyof AssessmentInput['movementTests'],
                            'score',
                            score.value
                          )
                        }
                        className={`rounded-lg border-2 p-2 sm:p-3 text-center transition-colors ${
                          formData.movementTests[
                            test.id as keyof AssessmentInput['movementTests']
                          ].score === score.value
                            ? `${score.color} border-transparent text-white`
                            : 'border-border hover:border-amber-500'
                        }`}
                      >
                        <div className="text-lg sm:text-xl font-bold">{score.value}</div>
                        <div className="text-[10px] sm:text-xs">{score.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor={`obs-${test.id}`}>Observações</Label>
                  <Input
                    id={`obs-${test.id}`}
                    placeholder="Observações sobre compensações, assimetrias..."
                    value={
                      formData.movementTests[
                        test.id as keyof AssessmentInput['movementTests']
                      ].observations
                    }
                    onChange={(e) =>
                      updateMovementTest(
                        test.id as keyof AssessmentInput['movementTests'],
                        'observations',
                        e.target.value
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 4: Body Metrics (Optional) */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Medidas Corporais</CardTitle>
            <CardDescription>
              Registre as medidas corporais do cliente (todos os campos são opcionais)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 75.5"
                  value={bodyMetrics.weight || ''}
                  onChange={(e) => setBodyMetrics({
                    ...bodyMetrics,
                    weight: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 175"
                  value={bodyMetrics.height || ''}
                  onChange={(e) => setBodyMetrics({
                    ...bodyMetrics,
                    height: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyFat">% Gordura Corporal</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 18.5"
                  value={bodyMetrics.bodyFat || ''}
                  onChange={(e) => setBodyMetrics({
                    ...bodyMetrics,
                    bodyFat: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                />
              </div>
            </div>

            {/* Circumference measurements */}
            <div>
              <Label className="mb-3 block text-base font-medium">Circunferências (cm)</Label>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Peitoral */}
                <div className="space-y-2">
                  <Label htmlFor="chest" className="text-sm">Peitoral</Label>
                  <Input
                    id="chest"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 100"
                    value={bodyMetrics.measurements?.chest || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, chest: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Cintura */}
                <div className="space-y-2">
                  <Label htmlFor="waist" className="text-sm">Cintura</Label>
                  <Input
                    id="waist"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 80"
                    value={bodyMetrics.measurements?.waist || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, waist: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Abdômen */}
                <div className="space-y-2">
                  <Label htmlFor="abdomen" className="text-sm">Abdômen</Label>
                  <Input
                    id="abdomen"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 85"
                    value={bodyMetrics.measurements?.abdomen || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, abdomen: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Quadril */}
                <div className="space-y-2">
                  <Label htmlFor="hip" className="text-sm">Quadril</Label>
                  <Input
                    id="hip"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 95"
                    value={bodyMetrics.measurements?.hip || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, hip: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Antebraço Direito */}
                <div className="space-y-2">
                  <Label htmlFor="forearm_right" className="text-sm">Antebraço Direito</Label>
                  <Input
                    id="forearm_right"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 30"
                    value={bodyMetrics.measurements?.forearm_right || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, forearm_right: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Antebraço Esquerdo */}
                <div className="space-y-2">
                  <Label htmlFor="forearm_left" className="text-sm">Antebraço Esquerdo</Label>
                  <Input
                    id="forearm_left"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 29"
                    value={bodyMetrics.measurements?.forearm_left || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, forearm_left: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Braço Direito */}
                <div className="space-y-2">
                  <Label htmlFor="arm_right" className="text-sm">Braço Direito</Label>
                  <Input
                    id="arm_right"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 36"
                    value={bodyMetrics.measurements?.arm_right || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, arm_right: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Braço Esquerdo */}
                <div className="space-y-2">
                  <Label htmlFor="arm_left" className="text-sm">Braço Esquerdo</Label>
                  <Input
                    id="arm_left"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 35"
                    value={bodyMetrics.measurements?.arm_left || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, arm_left: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Coxa Direita */}
                <div className="space-y-2">
                  <Label htmlFor="thigh_right" className="text-sm">Coxa Direita</Label>
                  <Input
                    id="thigh_right"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 58"
                    value={bodyMetrics.measurements?.thigh_right || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, thigh_right: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Coxa Esquerda */}
                <div className="space-y-2">
                  <Label htmlFor="thigh_left" className="text-sm">Coxa Esquerda</Label>
                  <Input
                    id="thigh_left"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 57"
                    value={bodyMetrics.measurements?.thigh_left || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, thigh_left: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Panturrilha Direita */}
                <div className="space-y-2">
                  <Label htmlFor="calf_right" className="text-sm">Panturrilha Direita</Label>
                  <Input
                    id="calf_right"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 38"
                    value={bodyMetrics.measurements?.calf_right || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, calf_right: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
                {/* Panturrilha Esquerda */}
                <div className="space-y-2">
                  <Label htmlFor="calf_left" className="text-sm">Panturrilha Esquerda</Label>
                  <Input
                    id="calf_left"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 37"
                    value={bodyMetrics.measurements?.calf_left || ''}
                    onChange={(e) => setBodyMetrics({
                      ...bodyMetrics,
                      measurements: { ...bodyMetrics.measurements, calf_left: e.target.value ? parseFloat(e.target.value) : undefined }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Skinfolds */}
            <div>
              <Label className="mb-1 block text-base font-medium">Dobras Cutâneas (mm)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                {assessment.client.gender === 'M'
                  ? 'Pollock 3: Peito + Abdômen + Coxa | Pollock 7: + Tríceps + Subescapular + Suprailíaca + Axilar Médio'
                  : 'Pollock 3: Tríceps + Suprailíaca + Coxa | Pollock 7: + Peito + Abdômen + Subescapular + Axilar Médio'}
              </p>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="sf_chest" className="text-sm">Peito</Label>
                  <Input id="sf_chest" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.chest || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, chest: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_abdomen" className="text-sm">Abdômen</Label>
                  <Input id="sf_abdomen" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.abdomen || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, abdomen: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_thigh" className="text-sm">Coxa</Label>
                  <Input id="sf_thigh" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.thigh || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, thigh: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_triceps" className="text-sm">Tríceps</Label>
                  <Input id="sf_triceps" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.triceps || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, triceps: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_suprailiac" className="text-sm">Suprailíaca</Label>
                  <Input id="sf_suprailiac" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.suprailiac || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, suprailiac: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_subscapular" className="text-sm">Subescapular</Label>
                  <Input id="sf_subscapular" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.subscapular || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, subscapular: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sf_midaxillary" className="text-sm">Axilar Médio</Label>
                  <Input id="sf_midaxillary" type="number" step="0.1" placeholder="mm"
                    value={bodyMetrics.skinfolds?.midaxillary || ''}
                    onChange={(e) => setBodyMetrics({ ...bodyMetrics, skinfolds: { ...bodyMetrics.skinfolds, midaxillary: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  />
                </div>
              </div>

              {/* Live Pollock calculation */}
              {(() => {
                const sf = bodyMetrics.skinfolds ?? {}
                const weight = bodyMetrics.weight ?? Number(assessment.client.weight) ?? null
                const gender = assessment.client.gender
                const birthDate = assessment.client.birthDate
                if (!weight || !gender || !birthDate || (gender !== 'M' && gender !== 'F')) return null
                const age = ageFromBirthDate(birthDate)
                if (age <= 0) return null
                const result = computePollock(sf as SkinfoldsInput, age, weight, gender as 'M' | 'F')
                if (!result) return null
                const methodNames: Record<string, string> = {
                  '3pt_male': 'Pollock 3 Dobras (♂)',
                  '3pt_female': 'Pollock 3 Dobras (♀)',
                  '7pt_male': 'Pollock 7 Dobras (♂)',
                  '7pt_female': 'Pollock 7 Dobras (♀)',
                }
                return (
                  <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Calculator className="h-4 w-4" />
                      {methodNames[result.method]} — Resultado Automático
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-emerald-500">{result.bodyFatPercent.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Gordura Corporal</div>
                      </div>
                      <div className="text-center bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-400">{result.fatKg.toFixed(1)} kg</div>
                        <div className="text-xs text-muted-foreground">Massa Gorda</div>
                      </div>
                      <div className="text-center bg-background rounded-lg p-3">
                        <div className="text-2xl font-bold text-cyan-400">{result.leanKg.toFixed(1)} kg</div>
                        <div className="text-xs text-muted-foreground">Massa Magra</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Soma das dobras: {result.sumSkinfolds.toFixed(1)} mm • Idade: {age} anos • Peso: {weight} kg</p>
                  </div>
                )
              })()}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="metricsNotes">Observações</Label>
              <Input
                id="metricsNotes"
                placeholder="Observações sobre as medidas..."
                value={bodyMetrics.notes || ''}
                onChange={(e) => setBodyMetrics({
                  ...bodyMetrics,
                  notes: e.target.value
                })}
              />
            </div>

            {/* BMI Calculation (if height and weight provided) */}
            {bodyMetrics.weight && bodyMetrics.height && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">IMC Calculado:</span>
                  <span className="text-lg font-bold text-foreground">
                    {(bodyMetrics.weight / Math.pow(bodyMetrics.height / 100, 2)).toFixed(1)} kg/m²
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Level and Process */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Nível de Experiência</CardTitle>
            <CardDescription>
              Selecione o nível de experiência do cliente com treinamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  value: 'BEGINNER',
                  label: 'Iniciante',
                  description: 'Pouca ou nenhuma experiência com treinamento',
                },
                {
                  value: 'INTERMEDIATE',
                  label: 'Intermediário',
                  description: 'Experiência moderada, pratica regularmente',
                },
                {
                  value: 'ADVANCED',
                  label: 'Avançado',
                  description: 'Experiência significativa, atleta ou similar',
                },
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      level: level.value as AssessmentInput['level'],
                    })
                  }
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.level === level.value
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:border-amber-500'
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {level.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-card border border-border p-4">
              <h4 className="mb-2 font-medium">Resumo da Avaliação</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queixas:</span>
                  <span>{formData.complaints.length} registrada(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Regiões com dor:
                  </span>
                  <span>
                    {
                      Object.values(formData.painMap).filter((v) => v > 0)
                        .length
                    }{' '}
                    região(ões)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Score médio de movimento:
                  </span>
                  <span>
                    {(
                      Object.values(formData.movementTests).reduce(
                        (acc, t) => acc + t.score,
                        0
                      ) / 7
                    ).toFixed(1)}
                    /3
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nível:</span>
                  <span>
                    {formData.level === 'BEGINNER'
                      ? 'Iniciante'
                      : formData.level === 'INTERMEDIATE'
                      ? 'Intermediário'
                      : 'Avançado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Process button */}
            <Button
              onClick={handleProcess}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 animate-pulse" />
                  Processando Avaliação...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Processar Avaliação
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        {step < 5 && (
          <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
