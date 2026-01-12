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
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    // Medidas corporais
    chest: '',
    waist: '',
    hip: '',
    arm: '',
    thigh: '',
    calf: '',
  })

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        const data = await res.json()

        if (data.success) {
          const client = data.data
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
            chest: client.chest ? String(client.chest) : '',
            waist: client.waist ? String(client.waist) : '',
            hip: client.hip ? String(client.hip) : '',
            arm: client.arm ? String(client.arm) : '',
            thigh: client.thigh ? String(client.thigh) : '',
            calf: client.calf ? String(client.calf) : '',
          })
        } else {
          alert('Cliente não encontrado')
          router.push('/clients')
        }
      } catch (error) {
        console.error('Error fetching client:', error)
        alert('Erro ao carregar cliente')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
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
      }

      if (formData.birthDate) {
        updateData.birthDate = formData.birthDate
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
      if (formData.chest) {
        updateData.chest = parseFloat(formData.chest)
      }
      if (formData.waist) {
        updateData.waist = parseFloat(formData.waist)
      }
      if (formData.hip) {
        updateData.hip = parseFloat(formData.hip)
      }
      if (formData.arm) {
        updateData.arm = parseFloat(formData.arm)
      }
      if (formData.thigh) {
        updateData.thigh = parseFloat(formData.thigh)
      }
      if (formData.calf) {
        updateData.calf = parseFloat(formData.calf)
      }

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await res.json()

      if (data.success) {
        alert('Cliente atualizado com sucesso!')
        router.push(`/clients/${clientId}`)
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
        <Link href={`/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
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
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
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
              </div>
            </div>

            {/* Dados Físicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados Físicos</h3>
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium mb-3">Medidas Corporais (cm)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="chest">Peitoral</Label>
                    <Input
                      id="chest"
                      type="number"
                      step="0.01"
                      value={formData.chest}
                      onChange={(e) =>
                        setFormData({ ...formData, chest: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waist">Cintura</Label>
                    <Input
                      id="waist"
                      type="number"
                      step="0.01"
                      value={formData.waist}
                      onChange={(e) =>
                        setFormData({ ...formData, waist: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hip">Quadril</Label>
                    <Input
                      id="hip"
                      type="number"
                      step="0.01"
                      value={formData.hip}
                      onChange={(e) =>
                        setFormData({ ...formData, hip: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arm">Braço</Label>
                    <Input
                      id="arm"
                      type="number"
                      step="0.01"
                      value={formData.arm}
                      onChange={(e) =>
                        setFormData({ ...formData, arm: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thigh">Coxa</Label>
                    <Input
                      id="thigh"
                      type="number"
                      step="0.01"
                      value={formData.thigh}
                      onChange={(e) =>
                        setFormData({ ...formData, thigh: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calf">Panturrilha</Label>
                    <Input
                      id="calf"
                      type="number"
                      step="0.01"
                      value={formData.calf}
                      onChange={(e) =>
                        setFormData({ ...formData, calf: e.target.value })
                      }
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
