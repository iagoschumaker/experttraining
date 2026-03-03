'use client'

// ============================================================================
// EXPERT PRO TRAINING - PRESENÇA (CHECK-IN) + SESSÃO EM GRUPO
// ============================================================================
// Permite selecionar múltiplos alunos, fazer check-in em grupo,
// e visualizar os treinos de todos numa única tela responsiva.
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    Users,
    Plus,
    X,
    ChevronDown,
    ChevronUp,
    Weight,
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

interface SessionExercise {
    name: string
    sets: number
    reps: string
    rest: string
    role: string
    weight?: string | null
    blockIdx?: number
    exerciseIdx?: number
}

interface SessionData {
    session: {
        dayIndex: number
        pillarLabel: string
        exercises: SessionExercise[]
        periodization: {
            phase: string
            phaseLabel: string
            week: number
        }
        preparation?: any
        blocks?: Array<{
            code: string
            name: string
            exercises: SessionExercise[]
        }>
        finalProtocol?: any
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
    checkedInToday?: boolean
    todayLesson?: {
        id: string
        date: string
        startedAt: string
        endedAt: string
        focus: string | null
        sessionIndex: number
        weekIndex: number
    } | null
}

// Data for each student in the group session
interface GroupStudent {
    client: Client
    workoutId: string
    sessionData: SessionData | null
    loading: boolean
    checkedIn: boolean
    error: string | null
    collapsed: boolean
}

export default function PresencaPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [allClients, setAllClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Multi-select mode
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Group session state
    const [sessionActive, setSessionActive] = useState(false)
    const [groupStudents, setGroupStudents] = useState<GroupStudent[]>([])
    const [startingSession, setStartingSession] = useState(false)

    // Weight saving state
    const [savingWeightKey, setSavingWeightKey] = useState<string | null>(null)

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

    // Workout ID map (client → active workout id)
    const [clientWorkoutMap, setClientWorkoutMap] = useState<Map<string, string>>(new Map())

    async function loadClients() {
        setLoadingClients(true)
        try {
            const res = await fetch('/api/studio/workouts?status=ACTIVE&limit=500')
            const data = await res.json()
            if (data.success) {
                const clientMap = new Map<string, Client>()
                const workoutMap = new Map<string, string>()
                const items = data.data?.items || data.data || []
                for (const w of items) {
                    if (w.isActive && w.client && !clientMap.has(w.client.id)) {
                        clientMap.set(w.client.id, {
                            id: w.client.id,
                            name: w.client.name,
                            email: w.client.email || null,
                            status: 'ACTIVE',
                            level: w.client.level,
                        })
                        workoutMap.set(w.client.id, w.id)
                    }
                }
                const uniqueClients = Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name))
                setAllClients(uniqueClients)
                setClients(uniqueClients)
                setClientWorkoutMap(workoutMap)
            }
        } catch (err) {
            console.error('Error loading clients:', err)
        } finally {
            setLoadingClients(false)
        }
    }

    function toggleSelect(clientId: string) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(clientId)) {
                next.delete(clientId)
            } else {
                next.add(clientId)
            }
            return next
        })
    }

    function selectAll() {
        const visibleIds = clients.map(c => c.id)
        setSelectedIds(new Set(visibleIds))
    }

    function deselectAll() {
        setSelectedIds(new Set())
    }

    // Start group session: load next-session for each selected student + auto check-in
    async function startGroupSession() {
        setStartingSession(true)
        const selected = allClients.filter(c => selectedIds.has(c.id))

        // Initialize group students
        const students: GroupStudent[] = selected.map(c => ({
            client: c,
            workoutId: clientWorkoutMap.get(c.id) || '',
            sessionData: null,
            loading: true,
            checkedIn: false,
            error: null,
            collapsed: false,
        }))
        setGroupStudents(students)
        setSessionActive(true)

        // Load sessions in parallel
        const promises = students.map(async (student, idx) => {
            if (!student.workoutId) {
                return { ...student, loading: false, error: 'Sem treino ativo' }
            }
            try {
                // GET next session
                const res = await fetch(`/api/studio/workouts/${student.workoutId}/next-session`)
                const data = await res.json()
                if (!data.success) {
                    return { ...student, loading: false, error: data.error || 'Erro ao carregar' }
                }
                const sessionData = data.data as SessionData

                // Auto check-in if not already checked in today
                let checkedIn = sessionData.checkedInToday || false
                if (!checkedIn && !sessionData.progress.isComplete) {
                    try {
                        const checkRes = await fetch(
                            `/api/studio/workouts/${student.workoutId}/next-session`,
                            { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                        )
                        const checkData = await checkRes.json()
                        if (checkData.success) {
                            checkedIn = true
                            sessionData.checkedInToday = true
                        }
                    } catch { /* ignore check-in error */ }
                }

                return { ...student, sessionData, loading: false, checkedIn, error: null }
            } catch (err) {
                return { ...student, loading: false, error: 'Erro de conexão' }
            }
        })

        const results = await Promise.all(promises)
        setGroupStudents(results)
        setStartingSession(false)
    }

    // Add a late student to the active session
    async function addLateStudent(client: Client) {
        const workoutId = clientWorkoutMap.get(client.id)
        if (!workoutId) return

        // Add loading placeholder
        const newStudent: GroupStudent = {
            client,
            workoutId,
            sessionData: null,
            loading: true,
            checkedIn: false,
            error: null,
            collapsed: false,
        }
        setGroupStudents(prev => [...prev, newStudent])
        setSelectedIds(prev => { const n = new Set(prev); n.add(client.id); return n })

        try {
            // GET next session
            const res = await fetch(`/api/studio/workouts/${workoutId}/next-session`)
            const data = await res.json()
            if (!data.success) {
                setGroupStudents(prev => prev.map(s =>
                    s.client.id === client.id ? { ...s, loading: false, error: data.error || 'Erro' } : s
                ))
                return
            }
            const sessionData = data.data as SessionData

            // Auto check-in
            let checkedIn = sessionData.checkedInToday || false
            if (!checkedIn && !sessionData.progress.isComplete) {
                try {
                    const checkRes = await fetch(
                        `/api/studio/workouts/${workoutId}/next-session`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                    )
                    const checkData = await checkRes.json()
                    if (checkData.success) checkedIn = true
                } catch { /* ignore */ }
            }

            setGroupStudents(prev => prev.map(s =>
                s.client.id === client.id ? { ...s, sessionData, loading: false, checkedIn, error: null } : s
            ))
        } catch {
            setGroupStudents(prev => prev.map(s =>
                s.client.id === client.id ? { ...s, loading: false, error: 'Erro de conexão' } : s
            ))
        }
    }

    // Remove student from active session
    function removeFromSession(clientId: string) {
        setGroupStudents(prev => prev.filter(s => s.client.id !== clientId))
        setSelectedIds(prev => { const n = new Set(prev); n.delete(clientId); return n })
    }

    // Toggle card collapse
    function toggleCollapse(clientId: string) {
        setGroupStudents(prev => prev.map(s =>
            s.client.id === clientId ? { ...s, collapsed: !s.collapsed } : s
        ))
    }

    // Save exercise weight
    async function saveWeight(
        studentIdx: number,
        workoutId: string,
        weekIdx: number,
        sessionIdx: number,
        blockIdx: number,
        exerciseIdx: number,
        weight: string
    ) {
        const key = `${studentIdx}-${blockIdx}-${exerciseIdx}`
        setSavingWeightKey(key)
        try {
            await fetch(`/api/studio/workouts/${workoutId}/exercise-weight`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekIdx, sessionIdx, blockIdx, exerciseIdx, weight: weight || null }),
            })
            // Update local state
            setGroupStudents(prev => prev.map((s, idx) => {
                if (idx !== studentIdx || !s.sessionData) return s
                const session = JSON.parse(JSON.stringify(s.sessionData.session))
                if (session.blocks?.[blockIdx]?.exercises?.[exerciseIdx]) {
                    session.blocks[blockIdx].exercises[exerciseIdx].weight = weight || null
                }
                // Also update flat exercises if they have matching indices
                if (session.exercises) {
                    const flatEx = session.exercises.find((e: any) => e.blockIdx === blockIdx && e.exerciseIdx === exerciseIdx)
                    if (flatEx) flatEx.weight = weight || null
                }
                return { ...s, sessionData: { ...s.sessionData, session } }
            }))
        } catch (err) {
            console.error('Error saving weight:', err)
        } finally {
            setSavingWeightKey(null)
        }
    }

    // End session
    function endSession() {
        setSessionActive(false)
        setGroupStudents([])
        setSelectedIds(new Set())
    }

    const levelLabel = (l?: string) =>
        l === 'INTERMEDIARIO'
            ? 'Intermediário'
            : l === 'AVANCADO'
                ? 'Avançado'
                : 'Iniciante'

    const pillarColor = (p: string) => {
        const lower = p?.toLowerCase() || ''
        if (lower.includes('lower') || lower.includes('inferior')) return 'bg-blue-500'
        if (lower.includes('push') || lower.includes('empurr')) return 'bg-red-500'
        if (lower.includes('pull') || lower.includes('pux')) return 'bg-green-500'
        return 'bg-amber-500'
    }

    const initials = (name: string) =>
        name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

    // ========================================================================
    // RENDER
    // ========================================================================

    // GROUP SESSION ACTIVE — show grid of workout cards
    if (sessionActive) {
        const studentsInSession = groupStudents.filter(s => s.sessionData || s.loading || s.error)
        const studentsNotInSession = allClients.filter(c =>
            !groupStudents.some(s => s.client.id === c.id)
        )

        return (
            <div className="space-y-4">
                {/* Session Header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Sessão em Grupo</h1>
                            <p className="text-sm text-muted-foreground">
                                {groupStudents.filter(s => s.checkedIn).length}/{groupStudents.length} alunos • {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={endSession}>
                            <X className="w-4 h-4 mr-1" />
                            Encerrar
                        </Button>
                    </div>
                </div>

                {/* Add Late Student */}
                {studentsNotInSession.length > 0 && (
                    <details className="group">
                        <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            <Plus className="w-4 h-4" />
                            Adicionar aluno atrasado ({studentsNotInSession.length} disponíveis)
                        </summary>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {studentsNotInSession.slice(0, 20).map(c => (
                                <Button
                                    key={c.id}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs justify-start"
                                    onClick={() => addLateStudent(c)}
                                >
                                    <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{c.name}</span>
                                </Button>
                            ))}
                        </div>
                    </details>
                )}

                {/* Workout Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {groupStudents.map((student, studentIdx) => (
                        <Card
                            key={student.client.id}
                            className={`overflow-hidden transition-all ${student.checkedIn
                                    ? 'border-green-500/30'
                                    : student.error
                                        ? 'border-red-500/30'
                                        : 'border-muted'
                                }`}
                        >
                            {/* Card Header — always visible */}
                            <div
                                className={`px-3 py-2 flex items-center justify-between cursor-pointer ${student.checkedIn ? 'bg-green-500/5' : student.error ? 'bg-red-500/5' : 'bg-muted/20'
                                    }`}
                                onClick={() => toggleCollapse(student.client.id)}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${student.checkedIn ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
                                        }`}>
                                        {initials(student.client.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{student.client.name}</p>
                                        {student.sessionData && (
                                            <div className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${pillarColor(student.sessionData.session.pillarLabel)}`} />
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {student.sessionData.session.pillarLabel} • Dia {student.sessionData.session.dayIndex + 1}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {student.checkedIn && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {student.loading && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
                                    {student.error && <AlertCircle className="w-4 h-4 text-red-500" />}
                                    {student.collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Card Body — collapsible */}
                            {!student.collapsed && (
                                <CardContent className="p-0">
                                    {student.loading && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                        </div>
                                    )}

                                    {student.error && (
                                        <div className="px-3 py-4 text-center">
                                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                            <p className="text-xs text-red-400">{student.error}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs mt-2"
                                                onClick={() => removeFromSession(student.client.id)}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    )}

                                    {student.sessionData && !student.loading && (
                                        <div className="divide-y divide-muted/30">
                                            {/* Phase + Progress mini */}
                                            <div className="px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                                                <span>{student.sessionData.session.periodization?.phaseLabel || student.sessionData.progress.currentPhaseLabel}</span>
                                                <span>Sem. {student.sessionData.progress.currentWeek} • {Math.round((student.sessionData.progress.attendanceRate ?? 0) * 100)}%</span>
                                            </div>

                                            {/* Preparation */}
                                            {student.sessionData.session.preparation && (
                                                <div className="px-3 py-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Preparação</p>
                                                    {(student.sessionData.session.preparation.exercises || []).map((ex: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                                            <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                                                            <span className="text-[10px] font-mono ml-1">{ex.sets}x{ex.reps} {ex.rest}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Blocks with exercises */}
                                            {student.sessionData.session.blocks
                                                ? student.sessionData.session.blocks.map((block, bIdx) => (
                                                    <div key={bIdx} className="px-3 py-1.5">
                                                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">
                                                            {block.code} {block.name}
                                                        </p>
                                                        {block.exercises.map((ex, eIdx) => (
                                                            <ExerciseRow
                                                                key={eIdx}
                                                                ex={ex}
                                                                studentIdx={studentIdx}
                                                                workoutId={student.workoutId}
                                                                weekIdx={(student.sessionData!.progress.currentWeek || 1) - 1}
                                                                sessionIdx={student.sessionData!.session.dayIndex}
                                                                blockIdx={bIdx}
                                                                exerciseIdx={eIdx}
                                                                savingKey={savingWeightKey}
                                                                onSaveWeight={saveWeight}
                                                            />
                                                        ))}
                                                    </div>
                                                ))
                                                : (
                                                    <div className="px-3 py-1.5">
                                                        {(student.sessionData.session.exercises || []).map((ex, i) => (
                                                            <ExerciseRow
                                                                key={i}
                                                                ex={ex}
                                                                studentIdx={studentIdx}
                                                                workoutId={student.workoutId}
                                                                weekIdx={(student.sessionData!.progress.currentWeek || 1) - 1}
                                                                sessionIdx={student.sessionData!.session.dayIndex}
                                                                blockIdx={ex.blockIdx ?? 0}
                                                                exerciseIdx={ex.exerciseIdx ?? i}
                                                                savingKey={savingWeightKey}
                                                                onSaveWeight={saveWeight}
                                                            />
                                                        ))}
                                                    </div>
                                                )
                                            }

                                            {/* Final Protocol */}
                                            {student.sessionData.session.finalProtocol && (
                                                <div className="px-3 py-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Protocolo Final</p>
                                                    {(student.sessionData.session.finalProtocol.exercises || []).map((ex: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                                            <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                                                            <span className="text-[10px] font-mono ml-1">{ex.sets}x{ex.reps} {ex.rest}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // ========================================================================
    // CLIENT SELECTION MODE — multi-select with checkboxes
    // ========================================================================
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
                        Selecione os alunos presentes e inicie a sessão
                    </p>
                </div>
            </div>

            {/* Search + Actions */}
            <Card>
                <CardContent className="p-4 space-y-3">
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
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={selectAll}
                                className="text-xs">
                                Selecionar Todos
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deselectAll}
                                className="text-xs" disabled={selectedIds.size === 0}>
                                Limpar
                            </Button>
                        </div>
                        {selectedIds.size > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Client List with checkboxes */}
            <div className="space-y-1">
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
                    clients.map((client) => {
                        const isSelected = selectedIds.has(client.id)
                        return (
                            <div
                                key={client.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                        ? 'border-green-500/50 bg-green-500/5'
                                        : 'border-transparent hover:border-muted hover:bg-muted/20'
                                    }`}
                                onClick={() => toggleSelect(client.id)}
                            >
                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-green-500 border-green-500' : 'border-muted-foreground/50'
                                    }`}>
                                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-amber-500 font-bold text-xs">
                                        {initials(client.name)}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{client.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {client.email || 'Sem email'}
                                    </p>
                                </div>

                                {/* Level */}
                                {client.level && (
                                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                        {levelLabel(client.level)}
                                    </Badge>
                                )}
                            </div>
                        )
                    })
                )}
                {clients.length > 0 && allClients.length > clients.length && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                        Mostrando {clients.length} de {allClients.length} alunos
                    </p>
                )}
            </div>

            {/* Start Session FAB */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        onClick={startGroupSession}
                        disabled={startingSession}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-2xl rounded-full px-8 h-14 text-lg gap-2"
                    >
                        {startingSession ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Users className="w-5 h-5" />
                        )}
                        Iniciar Sessão ({selectedIds.size})
                    </Button>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// EXERCISE ROW COMPONENT — with inline editable weight
// ============================================================================
function ExerciseRow({
    ex,
    studentIdx,
    workoutId,
    weekIdx,
    sessionIdx,
    blockIdx,
    exerciseIdx,
    savingKey,
    onSaveWeight,
}: {
    ex: SessionExercise
    studentIdx: number
    workoutId: string
    weekIdx: number
    sessionIdx: number
    blockIdx: number
    exerciseIdx: number
    savingKey: string | null
    onSaveWeight: (studentIdx: number, workoutId: string, weekIdx: number, sessionIdx: number, blockIdx: number, exerciseIdx: number, weight: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [weightValue, setWeightValue] = useState(ex.weight || '')
    const key = `${studentIdx}-${blockIdx}-${exerciseIdx}`
    const isSaving = savingKey === key

    const roleIcon = ex.role === 'FOCO_PRINCIPAL' ? '🎯'
        : ex.role === 'SECUNDARIO' ? '🔄' : '⚡'

    function handleSave() {
        onSaveWeight(studentIdx, workoutId, weekIdx, sessionIdx, blockIdx, exerciseIdx, weightValue)
        setEditing(false)
    }

    return (
        <div className="flex items-center gap-1.5 py-1 group">
            <span className="text-[10px] text-muted-foreground w-3">{roleIcon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} · {ex.rest}</p>
            </div>
            {/* Weight */}
            <div className="flex-shrink-0">
                {editing ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            className="w-14 h-6 text-xs text-center rounded border bg-background px-1"
                            value={weightValue}
                            onChange={(e) => setWeightValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                            autoFocus
                            placeholder="kg"
                        />
                        <button
                            className="text-green-500 hover:text-green-400"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        className={`h-6 px-1.5 rounded text-[10px] font-mono flex items-center gap-0.5 transition-colors ${ex.weight
                                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                        onClick={() => { setWeightValue(ex.weight || ''); setEditing(true) }}
                        title="Editar carga"
                    >
                        <Weight className="w-3 h-3" />
                        {ex.weight ? `${ex.weight}` : '—'}
                    </button>
                )}
            </div>
        </div>
    )
}
