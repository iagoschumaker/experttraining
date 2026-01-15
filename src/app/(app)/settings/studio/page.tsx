'use client'

// ============================================================================
// EXPERT TRAINING - STUDIO SETTINGS PAGE
// ============================================================================
// Área de configurações do Studio - Informações, Identidade Visual e Plano
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  Upload,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  CreditCard,
  Shield,
  Users,
  UserCheck,
} from 'lucide-react'
import Image from 'next/image'

interface StudioSettings {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  settings: {
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    website?: string
    instagram?: string
    facebook?: string
  }
  plan?: {
    name: string
    tier: string
    minTrainers?: number
    recommendedMax?: number
  }
  status: string
  isPaid: boolean
  _count?: {
    trainers: number
    activeTrainers: number
    clients: number
  }
  lastUsageRecord?: {
    activeTrainers: number
    periodStart: string
    periodEnd: string
  } | null
}

export default function StudioSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [studio, setStudio] = useState<StudioSettings | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    instagram: '',
    facebook: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    loadStudioSettings()
  }, [])

  async function loadStudioSettings() {
    try {
      const res = await fetch('/api/studio/settings')
      const data = await res.json()

      if (data.success) {
        setStudio(data.data)
        setFormData({
          name: data.data.name,
          phone: data.data.settings?.phone || '',
          email: data.data.settings?.email || '',
          address: data.data.settings?.address || '',
          city: data.data.settings?.city || '',
          state: data.data.settings?.state || '',
          zipCode: data.data.settings?.zipCode || '',
          website: data.data.settings?.website || '',
          instagram: data.data.settings?.instagram || '',
          facebook: data.data.settings?.facebook || '',
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao carregar configurações' })
      }
    } catch (error) {
      console.error('Error loading studio settings:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configurações do studio' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/studio/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          settings: {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            website: formData.website,
            instagram: formData.instagram,
            facebook: formData.facebook,
          },
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso' })
        loadStudioSettings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma imagem' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch('/api/studio/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Logo atualizada com sucesso' })
        loadStudioSettings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao fazer upload da logo' })
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage({ type: 'error', text: 'Erro ao fazer upload da logo' })
    } finally {
      setUploading(false)
    }
  }

  async function handlePasswordChange() {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos de senha' })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres' })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/studio/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar senha' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: 'Erro ao alterar senha' })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Erro ao carregar configurações</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Studio</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações institucionais e identidade visual do seu studio
        </p>
      </div>

      {/* Message Feedback */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card">
          <TabsTrigger value="info" className="flex items-center justify-center gap-1 px-2">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Info</span>
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center justify-center gap-1 px-2">
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Visual</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center justify-center gap-1 px-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center justify-center gap-1 px-2">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Plano</span>
          </TabsTrigger>
        </TabsList>

        {/* Informações */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Institucionais</CardTitle>
              <CardDescription>
                Estas informações serão usadas nos PDFs e documentos oficiais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nome do Studio *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Expert Training Studio"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@studio.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.studio.com.br"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua Exemplo, 123"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@studio"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="/studio"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identidade Visual */}
        <TabsContent value="visual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo do Studio</CardTitle>
              <CardDescription>
                Upload da logo que será usada nos PDFs e documentos (máx. 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {studio.logoUrl ? (
                  <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={studio.logoUrl}
                      alt="Logo do Studio"
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma logo</p>
                    </div>
                  </div>
                )}

                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label htmlFor="logo-upload">
                    <Button variant="outline" disabled={uploading} asChild>
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {studio.logoUrl ? 'Alterar Logo' : 'Fazer Upload'}
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Altere a senha de acesso do studio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirme a nova senha"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano */}
        <TabsContent value="plan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                Informações sobre o plano contratado e limites de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{studio.plan?.name || 'Nenhum plano'}</p>
                  <p className="text-sm text-muted-foreground">
                    Tier: {studio.plan?.tier || 'N/A'}
                  </p>
                </div>
                <Badge variant={studio.isPaid ? 'default' : 'destructive'}>
                  {studio.isPaid ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pendente
                    </>
                  )}
                </Badge>
              </div>

              {/* Limites e Uso */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Limites do Plano</h3>
                
                {/* Trainers Ativos (cobrados) */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium">Personal Ativos</span>
                      <Badge variant="outline" className="text-xs">Cobrados</Badge>
                    </div>
                    <span className={`text-sm font-bold ${
                      studio.plan?.recommendedMax && (studio._count?.activeTrainers || 0) >= studio.plan.recommendedMax
                        ? 'text-destructive'
                        : 'text-primary'
                    }`}>
                      {studio._count?.activeTrainers || 0} / {studio.plan?.recommendedMax || '∞'}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        studio.plan?.recommendedMax && (studio._count?.activeTrainers || 0) >= studio.plan.recommendedMax
                          ? 'bg-destructive'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: studio.plan?.recommendedMax
                          ? `${Math.min(((studio._count?.activeTrainers || 0) / studio.plan.recommendedMax) * 100, 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Personal que realizaram atividades (aulas, avaliações ou treinos) neste mês.
                    Mínimo cobrado: {studio.plan?.minTrainers || 1} personal(s).
                  </p>
                </div>

                {/* Trainers Cadastrados */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Personal Cadastrados</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {studio._count?.trainers || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total de personal cadastrados no sistema (ativos e inativos).
                  </p>
                </div>

                {/* Clients */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Clientes</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {studio._count?.clients || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total de clientes cadastrados no studio.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Para alterar seu plano ou gerenciar pagamentos, entre em contato com o suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
