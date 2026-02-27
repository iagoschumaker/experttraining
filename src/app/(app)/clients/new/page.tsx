// ============================================================================
// EXPERT PRO TRAINING - NOVO ALUNO
// ============================================================================
// Formulário de cadastro de aluno
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Calculator } from 'lucide-react'
import Link from 'next/link'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { SkinfoldsInput } from '@/services/pollock'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    height: '',
    weight: '',
    history: '',
    objectives: '',
    notes: '',
    goal: '',
    trainerId: 'none',
    // Medidas corporais
    chest: '',
    waist: '',
    hip: '',
    abdomen: '',
    bodyFat: '',
    // Bilateral
    armRight: '',
    armLeft: '',
    forearmRight: '',
    forearmLeft: '',
    thighRight: '',
    thighLeft: '',
    calfRight: '',
    calfLeft: '',
    // Dobras cutâneas (mm) — para cálculo Pollock (não salvas diretamente)
    sfChest: '',
    sfAbdomen: '',
    sfThigh: '',
    sfTriceps: '',
    sfSuprailiac: '',
    sfSubscapular: '',
    sfMidaxillary: '',
  })

  useEffect(() => {
    loadUserInfo()
  }, [])

  async function loadUserInfo() {
    try {
      // Carregar info do usuário para saber o role
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.success && data.data?.currentStudio) {
        setUserRole(data.data.currentStudio.role)
        
        // Só carregar trainers se for STUDIO_ADMIN
        if (data.data.currentStudio.role === 'STUDIO_ADMIN') {
          loadTrainers()
        }
      }
    } catch (err) {
      console.error('Error loading user info:', err)
    } finally {
      setLoadingRole(false)
    }
  }

  async function loadTrainers() {
    try {
      const res = await fetch('/api/studio/users')
      const data = await res.json()
      if (data.success) {
        setTrainers(data.users || [])
      }
    } catch (err) {
      console.error('Error loading trainers:', err)
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function formatDate(value: string) {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Aplica a máscara
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2)
    } else {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4) + '/' + numbers.slice(4, 8)
    }
  }

  function handleDateChange(value: string) {
    const formatted = formatDate(value)
    handleChange('birthDate', formatted)
  }

  function convertDateToISO(dateStr: string): string | null {
    if (!dateStr) return null
    
    // Se já está no formato ISO (YYYY-MM-DD)
    if (dateStr.includes('-') && dateStr.length === 10) {
      return dateStr
    }
    
    // Converte de DD/MM/AAAA para YYYY-MM-DD
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name || formData.name.length < 3) {
        setError('Nome deve ter no mínimo 3 caracteres')
        setLoading(false)
        return
      }

      if (formData.email && !formData.email.includes('@')) {
        setError('Email inválido')
        setLoading(false)
        return
      }

      // Prepare data
      const data: any = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        birthDate: convertDateToISO(formData.birthDate),
        gender: formData.gender || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        history: formData.history || null,
        objectives: formData.objectives || null,
        notes: formData.notes || null,
        goal: formData.goal || null,
        trainerId: formData.trainerId && formData.trainerId !== 'none' ? formData.trainerId : null,
        // Medidas corporais
        chest: formData.chest ? parseFloat(formData.chest) : null,
        waist: formData.waist ? parseFloat(formData.waist) : null,
        hip: formData.hip ? parseFloat(formData.hip) : null,
        abdomen: formData.abdomen ? parseFloat(formData.abdomen) : null,
        bodyFat: (() => {
          // Compute Pollock if skinfolds available, else use manual value
          const sf: SkinfoldsInput = {
            chest: formData.sfChest ? parseFloat(formData.sfChest) : undefined,
            abdomen: formData.sfAbdomen ? parseFloat(formData.sfAbdomen) : undefined,
            thigh: formData.sfThigh ? parseFloat(formData.sfThigh) : undefined,
            triceps: formData.sfTriceps ? parseFloat(formData.sfTriceps) : undefined,
            suprailiac: formData.sfSuprailiac ? parseFloat(formData.sfSuprailiac) : undefined,
            subscapular: formData.sfSubscapular ? parseFloat(formData.sfSubscapular) : undefined,
            midaxillary: formData.sfMidaxillary ? parseFloat(formData.sfMidaxillary) : undefined,
          }
          const weight = formData.weight ? parseFloat(formData.weight) : null
          const gender = formData.gender as 'M' | 'F' | null
          const isoDate = convertDateToISO(formData.birthDate)
          if (weight && (gender === 'M' || gender === 'F') && isoDate) {
            const age = ageFromBirthDate(isoDate)
            const result = computePollock(sf, age, weight, gender)
            if (result) return result.bodyFatPercent
          }
          return formData.bodyFat ? parseFloat(formData.bodyFat) : null
        })(),
        armRight: formData.armRight ? parseFloat(formData.armRight) : null,
        armLeft: formData.armLeft ? parseFloat(formData.armLeft) : null,
        forearmRight: formData.forearmRight ? parseFloat(formData.forearmRight) : null,
        forearmLeft: formData.forearmLeft ? parseFloat(formData.forearmLeft) : null,
        thighRight: formData.thighRight ? parseFloat(formData.thighRight) : null,
        thighLeft: formData.thighLeft ? parseFloat(formData.thighLeft) : null,
        calfRight: formData.calfRight ? parseFloat(formData.calfRight) : null,
        calfLeft: formData.calfLeft ? parseFloat(formData.calfLeft) : null,
      }

      const res = await fetch('/api/studio/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (result.success) {
        router.push(`/clients/${result.data.id}`)
      } else {
        setError(result.error || 'Erro ao cadastrar cliente')
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  // Loading state enquanto carrega role
  if (loadingRole) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Cliente</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Novo Aluno</h1>
          <p className="text-muted-foreground">Cadastre um novo aluno no sistema</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Informações básicas do aluno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="joao@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="text"
                  value={formData.birthDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="md:hidden"
                />
                <Input
                  id="birthDate-desktop"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="hidden md:block"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Só mostra seleção de trainer para STUDIO_ADMIN */}
              {userRole === 'STUDIO_ADMIN' && (
                <div className="space-y-2">
                  <Label htmlFor="trainerId">Treinador Responsável</Label>
                  <Select value={formData.trainerId} onValueChange={(value) => handleChange('trainerId', value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um treinador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dados Físicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Físicos</CardTitle>
            <CardDescription>Medidas e composição corporal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  value={formData.height}
                  onChange={(e) => handleChange('height', e.target.value)}
                  placeholder="170"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyFat">% Gordura Corporal</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.bodyFat}
                  onChange={(e) => handleChange('bodyFat', e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>

            {/* Medidas de Tronco */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Tronco</h4>
              <p className="text-xs text-muted-foreground mb-3">Circunferências (cm) e dobras cutâneas (mm) para cálculo Pollock</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chest">Peitoral (cm)</Label>
                  <Input id="chest" type="number" step="0.1" value={formData.chest}
                    onChange={(e) => handleChange('chest', e.target.value)} placeholder="95" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Cintura (cm)</Label>
                  <Input id="waist" type="number" step="0.1" value={formData.waist}
                    onChange={(e) => handleChange('waist', e.target.value)} placeholder="80" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hip">Quadril (cm)</Label>
                  <Input id="hip" type="number" step="0.1" value={formData.hip}
                    onChange={(e) => handleChange('hip', e.target.value)} placeholder="95" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abdomen">Abdômen (cm)</Label>
                  <Input id="abdomen" type="number" step="0.1" value={formData.abdomen}
                    onChange={(e) => handleChange('abdomen', e.target.value)} placeholder="82" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="sfChest" className="text-amber-500">Dobra Peito (mm)</Label>
                  <Input id="sfChest" type="number" step="0.1" placeholder="mm"
                    value={formData.sfChest} onChange={(e) => handleChange('sfChest', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfAbdomen" className="text-amber-500">Dobra Abdômen (mm)</Label>
                  <Input id="sfAbdomen" type="number" step="0.1" placeholder="mm"
                    value={formData.sfAbdomen} onChange={(e) => handleChange('sfAbdomen', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfSubscapular" className="text-amber-500">Dobra Subescapular (mm)</Label>
                  <Input id="sfSubscapular" type="number" step="0.1" placeholder="mm"
                    value={formData.sfSubscapular} onChange={(e) => handleChange('sfSubscapular', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfSuprailiac" className="text-amber-500">Dobra Suprailíaca (mm)</Label>
                  <Input id="sfSuprailiac" type="number" step="0.1" placeholder="mm"
                    value={formData.sfSuprailiac} onChange={(e) => handleChange('sfSuprailiac', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfMidaxillary" className="text-amber-500">Dobra Axilar Médio (mm)</Label>
                  <Input id="sfMidaxillary" type="number" step="0.1" placeholder="mm"
                    value={formData.sfMidaxillary} onChange={(e) => handleChange('sfMidaxillary', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Braços */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Braços</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="armRight">Braço Dir. (cm)</Label>
                  <Input id="armRight" type="number" step="0.1" value={formData.armRight}
                    onChange={(e) => handleChange('armRight', e.target.value)} placeholder="35" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="armLeft">Braço Esq. (cm)</Label>
                  <Input id="armLeft" type="number" step="0.1" value={formData.armLeft}
                    onChange={(e) => handleChange('armLeft', e.target.value)} placeholder="34" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forearmRight">Antebraço Dir. (cm)</Label>
                  <Input id="forearmRight" type="number" step="0.1" value={formData.forearmRight}
                    onChange={(e) => handleChange('forearmRight', e.target.value)} placeholder="28" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forearmLeft">Antebraço Esq. (cm)</Label>
                  <Input id="forearmLeft" type="number" step="0.1" value={formData.forearmLeft}
                    onChange={(e) => handleChange('forearmLeft', e.target.value)} placeholder="27" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="sfTriceps" className="text-amber-500">Dobra Tríceps (mm)</Label>
                  <Input id="sfTriceps" type="number" step="0.1" placeholder="mm"
                    value={formData.sfTriceps} onChange={(e) => handleChange('sfTriceps', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Pernas */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Pernas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thighRight">Coxa Dir. (cm)</Label>
                  <Input id="thighRight" type="number" step="0.1" value={formData.thighRight}
                    onChange={(e) => handleChange('thighRight', e.target.value)} placeholder="55" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thighLeft">Coxa Esq. (cm)</Label>
                  <Input id="thighLeft" type="number" step="0.1" value={formData.thighLeft}
                    onChange={(e) => handleChange('thighLeft', e.target.value)} placeholder="54" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calfRight">Panturrilha Dir. (cm)</Label>
                  <Input id="calfRight" type="number" step="0.1" value={formData.calfRight}
                    onChange={(e) => handleChange('calfRight', e.target.value)} placeholder="38" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calfLeft">Panturrilha Esq. (cm)</Label>
                  <Input id="calfLeft" type="number" step="0.1" value={formData.calfLeft}
                    onChange={(e) => handleChange('calfLeft', e.target.value)} placeholder="37" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="sfThigh" className="text-amber-500">Dobra Coxa (mm)</Label>
                  <Input id="sfThigh" type="number" step="0.1" placeholder="mm"
                    value={formData.sfThigh} onChange={(e) => handleChange('sfThigh', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Live Pollock result */}
            {(() => {
              const sf: SkinfoldsInput = {
                chest: formData.sfChest ? parseFloat(formData.sfChest) : undefined,
                abdomen: formData.sfAbdomen ? parseFloat(formData.sfAbdomen) : undefined,
                thigh: formData.sfThigh ? parseFloat(formData.sfThigh) : undefined,
                triceps: formData.sfTriceps ? parseFloat(formData.sfTriceps) : undefined,
                suprailiac: formData.sfSuprailiac ? parseFloat(formData.sfSuprailiac) : undefined,
                subscapular: formData.sfSubscapular ? parseFloat(formData.sfSubscapular) : undefined,
                midaxillary: formData.sfMidaxillary ? parseFloat(formData.sfMidaxillary) : undefined,
              }
              const weight = formData.weight ? parseFloat(formData.weight) : null
              const gender = formData.gender as 'M' | 'F' | null
              const isoDate = convertDateToISO(formData.birthDate)
              if (!weight || (gender !== 'M' && gender !== 'F') || !isoDate) return null
              const age = ageFromBirthDate(isoDate)
              if (age <= 0) return null
              const result = computePollock(sf, age, weight, gender)
              if (!result) return null
              const methodNames: Record<string, string> = {
                '3pt_male': 'Pollock 3 Dobras (♂)', '3pt_female': 'Pollock 3 Dobras (♀)',
                '7pt_male': 'Pollock 7 Dobras (♂)', '7pt_female': 'Pollock 7 Dobras (♀)',
              }
              return (
                <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Calculator className="h-4 w-4" />
                    {methodNames[result.method]} — Cálculo Automático
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center bg-background rounded-lg p-3">
                      <div className="text-2xl font-bold text-emerald-500">{result.bodyFatPercent.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Gordura</div>
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
                  <p className="text-xs text-muted-foreground">Soma: {result.sumSkinfolds.toFixed(1)} mm • % Gordura será salva automaticamente</p>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Histórico e Objetivos */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico e Objetivos</CardTitle>
            <CardDescription>Informações clínicas e metas do aluno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history">Histórico Médico</Label>
              <Textarea
                id="history"
                value={formData.history}
                onChange={(e) => handleChange('history', e.target.value)}
                placeholder="Lesões anteriores, cirurgias, patologias..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">Objetivos</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => handleChange('objectives', e.target.value)}
                placeholder="O que o aluno deseja alcançar..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Meta Principal</Label>
              <Select value={formData.goal} onValueChange={(value) => handleChange('goal', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma meta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HYPERTROPHY">Hipertrofia</SelectItem>
                  <SelectItem value="STRENGTH">Força</SelectItem>
                  <SelectItem value="CONDITIONING">Condicionamento</SelectItem>
                  <SelectItem value="WEIGHT_LOSS">Emagrecimento</SelectItem>
                  <SelectItem value="REHABILITATION">Reabilitação</SelectItem>
                  <SelectItem value="PERFORMANCE">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Notas adicionais do treinador..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/clients">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Cadastrar Aluno
          </Button>
        </div>
      </form>
    </div>
  )
}
