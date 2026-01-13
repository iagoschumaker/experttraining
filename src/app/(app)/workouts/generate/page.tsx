// ============================================================================
// EXPERT TRAINING - GENERATE WORKOUT PAGE
// ============================================================================
// Página de geração de treino - Compartilhado entre Studio e Personal
// ============================================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Zap,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Assessment {
  id: string
  createdAt: string
  client: {
    id: string
    name: string
  }
  resultJson: {
    functionalPattern: string
    primaryFocus: string
    allowedBlocks: string[]
    blockedBlocks: string[]
    recommendations: string[]
  }
  confidence: number
}

function GenerateWorkoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(assessmentId)

  const [formData, setFormData] = useState({
    weeklyFrequency: 3,
    phaseDuration: 4,
    notes: '',
  })

  useEffect(() => {
    if (assessmentId) {
      setSelectedAssessmentId(assessmentId)
      loadAssessment(assessmentId)
    } else {
      loadAvailableAssessments()
    }
  }, [assessmentId])

  async function loadAvailableAssessments() {
    try {
      const res = await fetch('/api/studio/assessments?status=COMPLETED&pageSize=50')
      const data = await res.json()

      if (data.success) {
        // Filtrar apenas avaliações que têm resultJson válido
        const validAssessments = (data.data.items || []).filter(
          (assess: Assessment) => assess.resultJson && assess.resultJson.functionalPattern
        )
        setAvailableAssessments(validAssessments)
      }
    } catch (err) {
      console.error('Error loading assessments:', err)
      setError('Erro ao carregar avaliações')
    } finally {
      setLoading(false)
    }
  }

  async function loadAssessment(id: string) {
    try {
      const res = await fetch(`/api/studio/assessments/${id}`)
      const data = await res.json()

      if (data.success) {
        if (data.data.status === 'COMPLETED') {
          setAssessment(data.data)
        } else {
          setError('Avaliação ainda não foi processada')
        }
      } else {
        setError('Avaliação não encontrada')
      }
    } catch (err) {
      console.error('Error loading assessment:', err)
      setError('Erro ao carregar avaliação')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!selectedAssessmentId) {
      setError('Selecione uma avaliação primeiro')
      return
    }

    setError(null)
    setGenerating(true)

    try {
      const payload = {
        assessmentId: selectedAssessmentId,
        weeklyFrequency: formData.weeklyFrequency,
        phaseDuration: formData.phaseDuration,
        notes: formData.notes,
      }

      console.log('🚀 Generating workout with payload:', payload)

      const res = await fetch('/api/studio/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/workouts/${data.data.workout.id}`)
      } else {
        const errorMsg = data.error || 'Erro ao gerar treino'
        const details = data.details ? '\n' + data.details.map((d: any) => `${d.field}: ${d.message}`).join('\n') : ''
        setError(errorMsg + details)
        console.error('❌ Generation failed:', data)
      }
    } catch (err) {
      console.error('Generate error:', err)
      setError('Erro de conexão')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  // Se não há avaliação selecionada, mostrar lista de avaliações disponíveis
  if (!assessment && !loading) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/workouts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Zap className="w-8 h-8" />
              Selecionar Avaliação
            </h1>
            <p className="text-muted-foreground">Escolha uma avaliação para gerar o treino</p>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Avaliações Concluídas</CardTitle>
            <CardDescription>Selecione uma avaliação para criar o treino</CardDescription>
          </CardHeader>
          <CardContent>
            {availableAssessments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma avaliação concluída encontrada</p>
                <Link href="/assessments">
                  <Button className="mt-4">Ir para Avaliações</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {availableAssessments.map((assess, index) => {
                  // Calculate assessment code
                  const clientAssessments = availableAssessments
                    .filter(a => a.client?.id === assess.client?.id)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  const assessmentIndex = clientAssessments.findIndex(a => a.id === assess.id)
                  const assessmentCode = `${String(assessmentIndex + 1).padStart(2, '0')}/${String(clientAssessments.length).padStart(2, '0')}`
                  
                  // Format date with time
                  const formattedDate = new Date(assess.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  
                  return (
                    <div
                      key={assess.id}
                      onClick={() => {
                        setSelectedAssessmentId(assess.id)
                        loadAssessment(assess.id)
                      }}
                      className="p-4 border rounded-lg cursor-pointer hover:border-amber-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-amber-600">{assessmentCode}</span>
                            <span className="text-xs text-muted-foreground">{formattedDate}</span>
                          </div>
                          <h3 className="font-semibold">{assess.client?.name || 'Cliente'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Padrão: {assess.resultJson?.functionalPattern || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-amber-500">
                            Concluída
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">{error || 'Avaliação não disponível'}</h2>
        <Link href="/assessments">
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/results/${assessmentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8" />
            Gerar Treino
          </h1>
          <p className="text-muted-foreground">Cliente: {assessment.client.name}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Assessment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Padrão Funcional</Label>
            <p className="font-semibold">{assessment.resultJson.functionalPattern}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Foco Primário</Label>
            <p>{assessment.resultJson.primaryFocus}</p>
          </div>
        </CardContent>
      </Card>

      {/* Blocks Preview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Blocos Permitidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assessment.resultJson.allowedBlocks.map((block, index) => (
                <Badge key={index} variant="outline" className="mr-2 bg-green-500/10 border-green-500/20 text-foreground">
                  {block}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Blocos Bloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assessment.resultJson.blockedBlocks.map((block, index) => (
                <Badge key={index} className="mr-2 bg-red-500/10 border border-red-500/20 text-foreground">
                  {block}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Configuração do Treino
          </CardTitle>
          <CardDescription>Defina a frequência e duração do programa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">
                Frequência Semanal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="frequency"
                type="number"
                min="1"
                max="7"
                value={formData.weeklyFrequency}
                onChange={(e) =>
                  setFormData({ ...formData, weeklyFrequency: parseInt(e.target.value) })
                }
              />
              <p className="text-sm text-muted-foreground">
                Número de sessões por semana (1-7)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">
                Duração da Fase (semanas) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="52"
                value={formData.phaseDuration}
                onChange={(e) =>
                  setFormData({ ...formData, phaseDuration: parseInt(e.target.value) })
                }
              />
              <p className="text-sm text-muted-foreground">
                Duração do ciclo de treino (1-52 semanas)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Adicione observações sobre o treino..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Pronto para Gerar</h3>
              <p className="text-sm text-muted-foreground">
                O treino será gerado automaticamente usando os blocos permitidos
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating} size="lg">
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Zap className="w-4 h-4 mr-2" />
              Gerar Treino
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GenerateWorkoutPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <GenerateWorkoutPage />
    </Suspense>
  )
}
