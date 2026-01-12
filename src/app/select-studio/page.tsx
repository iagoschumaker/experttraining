'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Skeleton } from '@/components/ui'
import { Building2, ChevronRight, Loader2, AlertCircle, Shield } from 'lucide-react'
import type { UserStudioLink } from '@/types'

interface UserData {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export default function SelectStudioPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [studios, setStudios] = useState<UserStudioLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        console.log('/api/auth/me response:', data)

        if (!data.success) {
          console.log('Not authenticated, redirecting to login')
          window.location.href = '/login'
          return
        }

        setUser(data.data.user)
        setStudios(data.data.studios || [])

        // SuperAdmin sees their linked studios (where they are STUDIO_ADMIN or TRAINER)
        // They don't need to see all studios here, only the ones they have a role in
        // The SuperAdmin dashboard option will always be available

        // Regular user with only one studio - auto-select
        if (!data.data.user.isSuperAdmin && data.data.studios?.length === 1) {
          console.log('Single studio user, auto-selecting')
          handleSelectStudio(data.data.studios[0].studioId)
          return
        }

        // If no studios and not superadmin, show message
        if (!data.data.user.isSuperAdmin && (!data.data.studios || data.data.studios.length === 0)) {
          setError('Você não tem acesso a nenhum studio. Entre em contato com o administrador.')
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching user data:', err)
        window.location.href = '/login'
      }
    }

    fetchUserData()
  }, [])

  async function handleSelectStudio(studioId: string) {
    setSelectingId(studioId)
    setError('')
    console.log('Selecting studio:', studioId)

    try {
      const response = await fetch('/api/auth/select-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId }),
      })

      const data = await response.json()
      console.log('Select studio response:', data)

      if (!data.success) {
        setError(data.error || 'Erro ao selecionar studio')
        setSelectingId(null)
        return
      }

      window.location.href = data.data.redirect
    } catch (err) {
      console.error('Error selecting studio:', err)
      setError('Erro de conexão. Tente novamente.')
      setSelectingId(null)
    }
  }

  function handleGoToSuperAdmin() {
    window.location.href = '/superadmin/dashboard'
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {user?.isSuperAdmin ? 'Painel de Acesso' : 'Selecione um Studio'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Olá, <span className="font-medium">{user?.name}</span>! 
            {user?.isSuperAdmin 
              ? ' Escolha para onde deseja ir.' 
              : ' Escolha qual studio deseja acessar.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SuperAdmin Options */}
        {user?.isSuperAdmin && (
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Super Administrador
              </CardTitle>
              <CardDescription>
                Acesse o painel de administração global
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <button
                onClick={handleGoToSuperAdmin}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left border-t"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Dashboard SuperAdmin
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gerenciar studios, usuários e configurações
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Studios List - Show user's linked studios */}
        {studios.length > 0 && (
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {user?.isSuperAdmin ? 'Seus Studios Vinculados' : 'Seus Studios'}
              </CardTitle>
              <CardDescription>
                Você tem acesso a {studios.length} studio{studios.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {studios.map((studio) => (
                  <button
                    key={studio.studioId}
                    onClick={() => handleSelectStudio(studio.studioId)}
                    disabled={selectingId !== null || studio.studioStatus === 'SUSPENDED'}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {studio.studioName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={studio.role === 'STUDIO_ADMIN' ? 'default' : 'secondary'}>
                            {studio.role === 'STUDIO_ADMIN' ? 'Admin' : 'Treinador'}
                          </Badge>
                          {studio.studioStatus === 'SUSPENDED' && (
                            <Badge variant="destructive">Suspenso</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {selectingId === studio.studioId ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : studio.studioStatus === 'ACTIVE' ? (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logout Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleLogout}>
            Sair da conta
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Expert Training. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
