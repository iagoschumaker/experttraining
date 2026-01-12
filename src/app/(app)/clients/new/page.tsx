// ============================================================================
// EXPERT TRAINING - NOVO ALUNO
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

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
    arm: '',
    thigh: '',
    calf: '',
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
        arm: formData.arm ? parseFloat(formData.arm) : null,
        thigh: formData.thigh ? parseFloat(formData.thigh) : null,
        calf: formData.calf ? parseFloat(formData.calf) : null,
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
      <div className="max-w-4xl mx-auto space-y-6">
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
    <div className="max-w-4xl mx-auto space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-medium mb-3">Medidas Corporais (cm)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chest">Peitoral</Label>
                  <Input
                    id="chest"
                    type="number"
                    step="0.01"
                    value={formData.chest}
                    onChange={(e) => handleChange('chest', e.target.value)}
                    placeholder="95"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waist">Cintura</Label>
                  <Input
                    id="waist"
                    type="number"
                    step="0.01"
                    value={formData.waist}
                    onChange={(e) => handleChange('waist', e.target.value)}
                    placeholder="80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hip">Quadril</Label>
                  <Input
                    id="hip"
                    type="number"
                    step="0.01"
                    value={formData.hip}
                    onChange={(e) => handleChange('hip', e.target.value)}
                    placeholder="95"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arm">Braço</Label>
                  <Input
                    id="arm"
                    type="number"
                    step="0.01"
                    value={formData.arm}
                    onChange={(e) => handleChange('arm', e.target.value)}
                    placeholder="35"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thigh">Coxa</Label>
                  <Input
                    id="thigh"
                    type="number"
                    step="0.01"
                    value={formData.thigh}
                    onChange={(e) => handleChange('thigh', e.target.value)}
                    placeholder="55"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calf">Panturrilha</Label>
                  <Input
                    id="calf"
                    type="number"
                    step="0.01"
                    value={formData.calf}
                    onChange={(e) => handleChange('calf', e.target.value)}
                    placeholder="38"
                  />
                </div>
              </div>
            </div>
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
