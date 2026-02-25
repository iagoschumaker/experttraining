'use client'

// ============================================================================
// EXPERT TRAINING - EDIT CLIENT PAGE
// ============================================================================
// Página de edição de cliente
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  objectives: string | null
  history: string | null
  birthDate: string | null
  gender: string | null
  height: number | null
  weight: number | null
  notes: string | null
  goal: string | null
  trainerId: string | null
  studioId: string | null
  bodyFat: number | null
  chest: number | null
  waist: number | null
  hip: number | null
  abdomen: number | null
  armRight: number | null
  armLeft: number | null
  forearmRight: number | null
  forearmLeft: number | null
  thighRight: number | null
  thighLeft: number | null
  calfRight: number | null
  calfLeft: number | null
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trainers, setTrainers] = useState<Array<{ userId: string; name: string }>>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  
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
    setFormData({ ...formData, birthDate: formatted })
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

  function convertISOToBR(dateStr: string): string {
    if (!dateStr) return ''
    
    // Se já está no formato brasileiro
    if (dateStr.includes('/')) return dateStr
    
    // Converte de YYYY-MM-DD para DD/MM/AAAA
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    
    return dateStr
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    objectives: '',
    history: '',
    birthDate: '',
    gender: '',
    height: '',
    weight: '',
    notes: '',
    goal: '',
    trainerId: '',
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
  })

  // Fetch client data and trainers
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is superadmin
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.success && meData.data?.user?.isSuperAdmin) {
          setIsSuperAdmin(true)
        }

        // First fetch client data
        const clientRes = await fetch(`/api/clients/${clientId}`)
        const clientData = await clientRes.json()

        if (clientData.success) {
          const client = clientData.data
          setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            objectives: client.objectives || '',
            history: client.history || '',
            birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
            gender: client.gender || '',
            height: client.height ? String(client.height) : '',
            weight: client.weight ? String(client.weight) : '',
            notes: client.notes || '',
            goal: client.goal || '',
            trainerId: client.trainerId || '',
            chest: client.chest ? String(client.chest) : '',
            waist: client.waist ? String(client.waist) : '',
            hip: client.hip ? String(client.hip) : '',
            abdomen: client.abdomen ? String(client.abdomen) : '',
            bodyFat: client.bodyFat ? String(client.bodyFat) : '',
            armRight: client.armRight ? String(client.armRight) : '',
            armLeft: client.armLeft ? String(client.armLeft) : '',
            forearmRight: client.forearmRight ? String(client.forearmRight) : '',
            forearmLeft: client.forearmLeft ? String(client.forearmLeft) : '',
            thighRight: client.thighRight ? String(client.thighRight) : '',
            thighLeft: client.thighLeft ? String(client.thighLeft) : '',
            calfRight: client.calfRight ? String(client.calfRight) : '',
            calfLeft: client.calfLeft ? String(client.calfLeft) : '',
          })

          // Then fetch trainers from the client's studio
          if (client.studioId) {
            const trainersRes = await fetch(`/api/superadmin/studios/${client.studioId}/trainers`)
            const trainersData = await trainersRes.json()
            
            if (trainersData.success) {
              // Map trainers to the format expected by the select (userId and name)
              const trainersFormatted = trainersData.data.items.map((t: any) => ({
                userId: t.oddsId,
                name: t.name
              }))
              setTrainers(trainersFormatted)
            }
          }
        } else {
          alert('Cliente não encontrado')
          router.push('/clients')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        alert('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [clientId, router])

  // Update client
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Prepare data
      const updateData: any = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        objectives: formData.objectives || null,
        history: formData.history || null,
        notes: formData.notes || null,
        goal: formData.goal || null,
        trainerId: formData.trainerId || null,
      }

      if (formData.birthDate) {
        updateData.birthDate = convertDateToISO(formData.birthDate)
      }
      if (formData.gender) {
        updateData.gender = formData.gender
      }
      if (formData.height) {
        updateData.height = parseFloat(formData.height)
      }
      if (formData.weight) {
        updateData.weight = parseFloat(formData.weight)
      }
      updateData.chest = formData.chest ? parseFloat(formData.chest) : null
      updateData.waist = formData.waist ? parseFloat(formData.waist) : null
      updateData.hip = formData.hip ? parseFloat(formData.hip) : null
      updateData.abdomen = formData.abdomen ? parseFloat(formData.abdomen) : null
      updateData.bodyFat = formData.bodyFat ? parseFloat(formData.bodyFat) : null
      updateData.armRight = formData.armRight ? parseFloat(formData.armRight) : null
      updateData.armLeft = formData.armLeft ? parseFloat(formData.armLeft) : null
      updateData.forearmRight = formData.forearmRight ? parseFloat(formData.forearmRight) : null
      updateData.forearmLeft = formData.forearmLeft ? parseFloat(formData.forearmLeft) : null
      updateData.thighRight = formData.thighRight ? parseFloat(formData.thighRight) : null
      updateData.thighLeft = formData.thighLeft ? parseFloat(formData.thighLeft) : null
      updateData.calfRight = formData.calfRight ? parseFloat(formData.calfRight) : null
      updateData.calfLeft = formData.calfLeft ? parseFloat(formData.calfLeft) : null

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (data.success) {
        alert('Cliente atualizado com sucesso!')
        if (isSuperAdmin) {
          router.push('/superadmin/users')
        } else {
          router.push(`/clients/${clientId}`)
        }
      } else {
        alert(data.error || 'Erro ao atualizar cliente')
      }
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Erro ao atualizar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          if (isSuperAdmin) {
            router.push('/superadmin/users')
          } else {
            router.push(`/clients/${clientId}`)
          }
        }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Aluno</h1>
          <p className="text-sm text-gray-500">Atualize as informações do aluno</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Aluno</CardTitle>
            <CardDescription>
              Preencha os dados do aluno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Pessoais</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    className="hidden md:block"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Selecione</option>
                    <option value="M" className="bg-background text-foreground">Masculino</option>
                    <option value="F" className="bg-background text-foreground">Feminino</option>
                    <option value="O" className="bg-background text-foreground">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainerId">Personal Responsável</Label>
                  <select
                    id="trainerId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.trainerId}
                    onChange={(e) =>
                      setFormData({ ...formData, trainerId: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Nenhum</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.userId} value={trainer.userId} className="bg-background text-foreground">
                        {trainer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dados Físicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Físicos</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({ ...formData, height: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, bodyFat: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Tronco */}
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Tronco (cm)</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="chest">Peitoral</Label>
                    <Input
                      id="chest"
                      type="number"
                      step="0.1"
                      value={formData.chest}
                      onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waist">Cintura</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.1"
                      value={formData.waist}
                      onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hip">Quadril</Label>
                    <Input
                      id="hip"
                      type="number"
                      step="0.1"
                      value={formData.hip}
                      onChange={(e) => setFormData({ ...formData, hip: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abdomen">Abdômen</Label>
                    <Input
                      id="abdomen"
                      type="number"
                      step="0.1"
                      value={formData.abdomen}
                      onChange={(e) => setFormData({ ...formData, abdomen: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Braços */}
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Braços (cm)</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="armRight">Braço Dir.</Label>
                    <Input
                      id="armRight"
                      type="number"
                      step="0.1"
                      value={formData.armRight}
                      onChange={(e) => setFormData({ ...formData, armRight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="armLeft">Braço Esq.</Label>
                    <Input
                      id="armLeft"
                      type="number"
                      step="0.1"
                      value={formData.armLeft}
                      onChange={(e) => setFormData({ ...formData, armLeft: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forearmRight">Antebraço Dir.</Label>
                    <Input
                      id="forearmRight"
                      type="number"
                      step="0.1"
                      value={formData.forearmRight}
                      onChange={(e) => setFormData({ ...formData, forearmRight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forearmLeft">Antebraço Esq.</Label>
                    <Input
                      id="forearmLeft"
                      type="number"
                      step="0.1"
                      value={formData.forearmLeft}
                      onChange={(e) => setFormData({ ...formData, forearmLeft: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Pernas */}
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Pernas (cm)</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="thighRight">Coxa Dir.</Label>
                    <Input
                      id="thighRight"
                      type="number"
                      step="0.1"
                      value={formData.thighRight}
                      onChange={(e) => setFormData({ ...formData, thighRight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thighLeft">Coxa Esq.</Label>
                    <Input
                      id="thighLeft"
                      type="number"
                      step="0.1"
                      value={formData.thighLeft}
                      onChange={(e) => setFormData({ ...formData, thighLeft: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calfRight">Panturrilha Dir.</Label>
                    <Input
                      id="calfRight"
                      type="number"
                      step="0.1"
                      value={formData.calfRight}
                      onChange={(e) => setFormData({ ...formData, calfRight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calfLeft">Panturrilha Esq.</Label>
                    <Input
                      id="calfLeft"
                      type="number"
                      step="0.1"
                      value={formData.calfLeft}
                      onChange={(e) => setFormData({ ...formData, calfLeft: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Objetivos e Histórico */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Objetivos e Histórico</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objectives">Objetivos</Label>
                  <Textarea
                    id="objectives"
                    rows={3}
                    value={formData.objectives}
                    onChange={(e) =>
                      setFormData({ ...formData, objectives: e.target.value })
                    }
                    placeholder="Ex: Ganhar massa muscular, melhorar condicionamento..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history">Histórico Médico</Label>
                  <Textarea
                    id="history"
                    rows={3}
                    value={formData.history}
                    onChange={(e) =>
                      setFormData({ ...formData, history: e.target.value })
                    }
                    placeholder="Lesões, patologias, cirurgias anteriores..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">Meta Principal</Label>
                  <select
                    id="goal"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.goal}
                    onChange={(e) =>
                      setFormData({ ...formData, goal: e.target.value })
                    }
                  >
                    <option value="" className="bg-background text-foreground">Selecione uma meta</option>
                    <option value="HYPERTROPHY" className="bg-background text-foreground">Hipertrofia</option>
                    <option value="STRENGTH" className="bg-background text-foreground">Força</option>
                    <option value="CONDITIONING" className="bg-background text-foreground">Condicionamento</option>
                    <option value="WEIGHT_LOSS" className="bg-background text-foreground">Emagrecimento</option>
                    <option value="REHABILITATION" className="bg-background text-foreground">Reabilitação</option>
                    <option value="PERFORMANCE" className="bg-background text-foreground">Performance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Notas adicionais sobre o aluno..."
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Link href={`/clients/${clientId}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
