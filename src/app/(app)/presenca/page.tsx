'use client'

// ============================================================================
// EXPERT PRO TRAINING - PRESENÇA (CHECK-IN)
// ============================================================================
// Página rápida para registrar presença do aluno
// Pesquisa aluno → mostra treino do dia → confirma presença
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    UserCheck,
    Search,
    Loader2,
    CheckCircle,
    Dumbbell,
    Activity,
    Clock,
    AlertCircle,
} from 'lucide-react'

interface Client {
    id: string
    name: string
    email: string | null
    status: string
    level?: string
}

interface WorkoutInfo {
    id: string
    name: string | null
    isActive: boolean
    sessionsCompleted: number
    sessionsPerWeek: number
    targetWeeks: number
}

interface SessionData {
    session: {
        dayIndex: number
        pillarLabel: string
        exercises: Array<{
            name: string
            sets: number
            reps: string
            rest: string
            role: string
        }>
        periodization: {
            phase: string
            phaseLabel: string
            week: number
        }
    }
    progress: {
        attendanceRate: number
        attendanceRateLabel: string
        attendanceStatus: string
        currentWeek: number
        currentPhaseLabel: string
        sessionsCompleted: number
        sessionsExpectedByNow: number
        canReassess: boolean
        mustExtend: boolean
        isComplete: boolean
    }
    client: { id: string; name: string }
    workoutName: string
}

export default function PresencaPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [allClients, setAllClients] = useState<Client[]>([])
    const [searching, setSearching] = useState(false)
    const [loadingClients, setLoadingClients] = useState(true)

    // Selected client state
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [workouts, setWorkouts] = useState<WorkoutInfo[]>([])
    const [loadingWorkouts, setLoadingWorkouts] = useState(false)

    // Session state
    const [sessionData, setSessionData] = useState<SessionData | null>(null)
    const [loadingSession, setLoadingSession] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [checkInSuccess, setCheckInSuccess] = useState(false)

    // Load all clients on mount
    useEffect(() => {
        loadClients()
    }, [])

    // Filter clients when search changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setClients(allClients)
            return
        }
        const q = searchQuery.toLowerCase()
        setClients(
            allClients.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    (c.email && c.email.toLowerCase().includes(q))
            )
        )
    }, [searchQuery, allClients])

    async function loadClients() {
        setLoadingClients(true)
        try {
            const res = await fetch('/api/studio/clients?limit=500')
            const data = await res.json()
            if (data.success) {
                const activeClients = (data.data || []).filter(
                    (c: any) => c.status === 'ACTIVE'
                )
                setAllClients(activeClients)
                setClients(activeClients)
            }
        } catch (err) {
            console.error('Error loading clients:', err)
        } finally {
            setLoadingClients(false)
        }
    }

    async function selectClient(client: Client) {
        setSelectedClient(client)
        setCheckInSuccess(false)
        setSessionData(null)
        setLoadingWorkouts(true)

        try {
            // Buscar treinos ativos do cliente
            const res = await fetch(`/api/studio/clients/${client.id}/workouts`)
            const data = await res.json()

            if (data.success) {
                const activeWorkouts = (data.data || []).filter((w: any) => w.isActive)
                setWorkouts(activeWorkouts)

                // Se tem treino ativo, buscar próxima sessão
                if (activeWorkouts.length > 0) {
                    loadNextSession(activeWorkouts[0].id)
                }
            }
        } catch (err) {
            console.error('Error loading workouts:', err)
        } finally {
            setLoadingWorkouts(false)
        }
    }

    async function loadNextSession(workoutId: string) {
        setLoadingSession(true)
        try {
            const res = await fetch(
                `/api/studio/workouts/${workoutId}/next-session`
            )
            const data = await res.json()
            if (data.success) {
                setSessionData(data.data)
            }
        } catch (err) {
            console.error('Error loading session:', err)
        } finally {
            setLoadingSession(false)
        }
    }

    async function handleCheckIn(workoutId: string) {
        setRegistering(true)
        try {
            const res = await fetch(
                `/api/studio/workouts/${workoutId}/next-session`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            )
            const data = await res.json()

            if (data.success) {
                setCheckInSuccess(true)
                // Recarregar sessão atualizada
                loadNextSession(workoutId)
                setTimeout(() => setCheckInSuccess(false), 5000)
            } else {
                alert(data.error || 'Erro ao registrar presença')
            }
        } catch (err) {
            console.error('Check-in error:', err)
            alert('Erro de conexão')
        } finally {
            setRegistering(false)
        }
    }

    function resetSelection() {
        setSelectedClient(null)
        setWorkouts([])
        setSessionData(null)
        setCheckInSuccess(false)
        setSearchQuery('')
    }

    const levelLabel = (l?: string) =>
        l === 'INTERMEDIARIO'
            ? 'Intermediário'
            : l === 'AVANCADO'
                ? 'Avançado'
                : 'Iniciante'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Presença</h1>
                    <p className="text-sm text-muted-foreground">
                        Registre a chegada do aluno e veja o treino do dia
                    </p>
                </div>
            </div>

            {!selectedClient ? (
                <>
                    {/* Search */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar aluno por nome ou email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Client List */}
                    <div className="space-y-2">
                        {loadingClients ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                            </div>
                        ) : clients.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    {searchQuery
                                        ? 'Nenhum aluno encontrado'
                                        : 'Nenhum aluno ativo'}
                                </CardContent>
                            </Card>
                        ) : (
                            clients.slice(0, 20).map((client) => (
                                <Card
                                    key={client.id}
                                    className="cursor-pointer hover:border-amber-500/50 transition-colors"
                                    onClick={() => selectClient(client)}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                <span className="text-amber-500 font-bold text-sm">
                                                    {client.name
                                                        .split(' ')
                                                        .map((w) => w[0])
                                                        .slice(0, 2)
                                                        .join('')
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{client.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {client.email || 'Sem email'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {client.level && (
                                                <Badge variant="outline" className="text-xs">
                                                    {levelLabel(client.level)}
                                                </Badge>
                                            )}
                                            <Button size="sm" variant="outline">
                                                <UserCheck className="w-4 h-4 mr-1" />
                                                Check-in
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                        {clients.length > 20 && (
                            <p className="text-center text-sm text-muted-foreground py-2">
                                Mostrando 20 de {clients.length} alunos. Refine a pesquisa.
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Selected Client Header */}
                    <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <span className="text-green-500 font-bold">
                                            {selectedClient.name
                                                .split(' ')
                                                .map((w) => w[0])
                                                .slice(0, 2)
                                                .join('')
                                                .toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{selectedClient.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {levelLabel(selectedClient.level)}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {selectedClient.email}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={resetSelection}>
                                    Trocar aluno
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Loading */}
                    {(loadingWorkouts || loadingSession) && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                        </div>
                    )}

                    {/* No active workout */}
                    {!loadingWorkouts && workouts.length === 0 && (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                                <p className="font-medium">Nenhum treino ativo</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Este aluno não possui treino em aberto. Gere um novo treino
                                    através de uma avaliação.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Success check-in */}
                    {checkInSuccess && (
                        <Card className="border-green-500/30 bg-green-500/5">
                            <CardContent className="py-4 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-green-500">
                                        ✅ Presença registrada com sucesso!
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date().toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}{' '}
                                        — Horário salvo
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Session / Workout for today */}
                    {sessionData && !loadingSession && (
                        <>
                            {/* Progress Bar */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Activity className="w-5 h-5 text-amber-500" />
                                        Progresso
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(() => {
                                        const p = sessionData.progress
                                        const pct = Math.round((p.attendanceRate ?? 0) * 100)
                                        const barColor =
                                            p.attendanceStatus === 'ON_TRACK'
                                                ? 'bg-green-500'
                                                : p.attendanceStatus === 'BELOW_TARGET'
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        Frequência: {p.attendanceRateLabel}
                                                    </span>
                                                    <span>
                                                        Sem. {p.currentWeek} • {p.currentPhaseLabel}
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${barColor}`}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {p.sessionsCompleted} sessões feitas
                                                    </span>
                                                    <span>Meta: 85%</span>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </CardContent>
                            </Card>

                            {/* Today's Workout */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Dumbbell className="w-5 h-5 text-amber-500" />
                                        Treino de Hoje — {sessionData.session.pillarLabel}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Sessão {sessionData.session.dayIndex + 1} •{' '}
                                        {sessionData.session.periodization?.phaseLabel ||
                                            sessionData.progress.currentPhaseLabel}
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {sessionData.session.exercises?.map((ex, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-muted-foreground w-5">
                                                        {i + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-sm">{ex.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {ex.role === 'FOCO_PRINCIPAL'
                                                                ? '🎯 Foco'
                                                                : ex.role === 'SECUNDARIO'
                                                                    ? '🔄 Secundário'
                                                                    : '⚡ Complementar'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="font-medium">
                                                        {ex.sets}x{ex.reps}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ex.rest}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Check-in Button */}
                                    <div className="mt-6 pt-4 border-t">
                                        <Button
                                            onClick={() =>
                                                workouts[0] && handleCheckIn(workouts[0].id)
                                            }
                                            disabled={registering || sessionData.progress.isComplete}
                                            size="lg"
                                            className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
                                        >
                                            {registering ? (
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 mr-2" />
                                            )}
                                            {sessionData.progress.isComplete
                                                ? 'Programa Completo'
                                                : '✅ Confirmar Presença'}
                                        </Button>
                                        <p className="text-center text-xs text-muted-foreground mt-2">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            Horário será salvo automaticamente
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
