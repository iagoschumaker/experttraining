'use client'

// ============================================================================
// EXPERT PRO TRAINING - PRESENÇA (CHECK-IN) + SESSÃO EM GRUPO (MULTI-TABS)
// ============================================================================
// Multi-select → múltiplas sessões em abas → check-in automático + 85%
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
    ArrowLeft,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================
interface Client {
    id: string
    name: string
    email: string | null
    status: string
    level?: string
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

interface GroupStudent {
    client: Client
    workoutId: string
    sessionData: SessionData | null
    loading: boolean
    checkedIn: boolean
    error: string | null
    collapsed: boolean
}

interface SessionTab {
    id: string
    label: string
    students: GroupStudent[]
    createdAt: Date
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PresencaPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [clients, setClients] = useState<Client[]>([])
    const [allClients, setAllClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [clientWorkoutMap, setClientWorkoutMap] = useState<Map<string, string>>(new Map())

    // Multi-select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [startingSession, setStartingSession] = useState(false)

    // Multiple session tabs
    const [sessions, setSessions] = useState<SessionTab[]>([])
    const [activeTabId, setActiveTabId] = useState<string | null>(null)

    // Weight saving
    const [savingWeightKey, setSavingWeightKey] = useState<string | null>(null)

    const activeSession = sessions.find(s => s.id === activeTabId) || null

    // ========================================================================
    // DATA LOADING
    // ========================================================================
    useEffect(() => { loadClients() }, [])

    useEffect(() => {
        if (!searchQuery.trim()) { setClients(allClients); return }
        const q = searchQuery.toLowerCase()
        setClients(allClients.filter(c =>
            c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q))
        ))
    }, [searchQuery, allClients])

    async function loadClients() {
        setLoadingClients(true)
        try {
            const res = await fetch('/api/studio/workouts?status=ACTIVE&limit=500')
            const data = await res.json()
            if (data.success) {
                const cMap = new Map<string, Client>()
                const wMap = new Map<string, string>()
                const items = data.data?.items || data.data || []
                for (const w of items) {
                    if (w.isActive && w.client && !cMap.has(w.client.id)) {
                        cMap.set(w.client.id, {
                            id: w.client.id, name: w.client.name,
                            email: w.client.email || null, status: 'ACTIVE', level: w.client.level,
                        })
                        wMap.set(w.client.id, w.id)
                    }
                }
                const sorted = Array.from(cMap.values()).sort((a, b) => a.name.localeCompare(b.name))
                setAllClients(sorted)
                setClients(sorted)
                setClientWorkoutMap(wMap)
            }
        } catch (err) { console.error('Error loading clients:', err) }
        finally { setLoadingClients(false) }
    }

    // ========================================================================
    // SELECTION LOGIC
    // ========================================================================
    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const n = new Set(prev)
            n.has(id) ? n.delete(id) : n.add(id)
            return n
        })
    }
    function selectAll() { setSelectedIds(new Set(clients.map(c => c.id))) }
    function deselectAll() { setSelectedIds(new Set()) }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================
    async function startGroupSession() {
        setStartingSession(true)
        const selected = allClients.filter(c => selectedIds.has(c.id))
        const tabId = `session-${Date.now()}`
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        const students: GroupStudent[] = selected.map(c => ({
            client: c, workoutId: clientWorkoutMap.get(c.id) || '',
            sessionData: null, loading: true, checkedIn: false, error: null, collapsed: false,
        }))

        const newTab: SessionTab = { id: tabId, label: `${time} (${selected.length})`, students, createdAt: new Date() }
        setSessions(prev => [...prev, newTab])
        setActiveTabId(tabId)
        setSelectedIds(new Set())
        setStartingSession(false)

        // Load sessions + auto check-in in parallel
        const results = await Promise.all(students.map(async (student) => {
            if (!student.workoutId) return { ...student, loading: false, error: 'Sem treino ativo' }
            try {
                const res = await fetch(`/api/studio/workouts/${student.workoutId}/next-session`)
                const data = await res.json()
                if (!data.success) return { ...student, loading: false, error: data.error || 'Erro' }
                const sessionData = data.data as SessionData

                let checkedIn = sessionData.checkedInToday || false
                if (!checkedIn && !sessionData.progress.isComplete) {
                    try {
                        const cr = await fetch(`/api/studio/workouts/${student.workoutId}/next-session`,
                            { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                        const cd = await cr.json()
                        if (cd.success) { checkedIn = true; sessionData.checkedInToday = true }
                    } catch { }
                }
                return { ...student, sessionData, loading: false, checkedIn, error: null }
            } catch { return { ...student, loading: false, error: 'Erro de conexão' } }
        }))

        setSessions(prev => prev.map(s => s.id === tabId ? { ...s, students: results } : s))
    }

    async function addLateStudent(client: Client, tabId: string) {
        const workoutId = clientWorkoutMap.get(client.id)
        if (!workoutId) return

        const newStudent: GroupStudent = {
            client, workoutId, sessionData: null,
            loading: true, checkedIn: false, error: null, collapsed: false,
        }

        setSessions(prev => prev.map(s =>
            s.id === tabId ? { ...s, students: [...s.students, newStudent], label: s.label.replace(/\(\d+\)/, `(${s.students.length + 1})`) } : s
        ))

        try {
            const res = await fetch(`/api/studio/workouts/${workoutId}/next-session`)
            const data = await res.json()
            if (!data.success) {
                updateStudent(tabId, client.id, { loading: false, error: data.error || 'Erro' })
                return
            }
            const sessionData = data.data as SessionData
            let checkedIn = sessionData.checkedInToday || false
            if (!checkedIn && !sessionData.progress.isComplete) {
                try {
                    const cr = await fetch(`/api/studio/workouts/${workoutId}/next-session`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                    const cd = await cr.json()
                    if (cd.success) checkedIn = true
                } catch { }
            }
            updateStudent(tabId, client.id, { sessionData, loading: false, checkedIn, error: null })
        } catch {
            updateStudent(tabId, client.id, { loading: false, error: 'Erro de conexão' })
        }
    }

    function updateStudent(tabId: string, clientId: string, updates: Partial<GroupStudent>) {
        setSessions(prev => prev.map(s =>
            s.id === tabId ? { ...s, students: s.students.map(st => st.client.id === clientId ? { ...st, ...updates } : st) } : s
        ))
    }

    function removeFromSession(tabId: string, clientId: string) {
        setSessions(prev => prev.map(s =>
            s.id === tabId ? { ...s, students: s.students.filter(st => st.client.id !== clientId) } : s
        ))
    }

    function closeSession(tabId: string) {
        setSessions(prev => prev.filter(s => s.id !== tabId))
        if (activeTabId === tabId) {
            const remaining = sessions.filter(s => s.id !== tabId)
            setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
        }
    }

    function toggleCollapse(tabId: string, clientId: string) {
        setSessions(prev => prev.map(s =>
            s.id === tabId ? { ...s, students: s.students.map(st => st.client.id === clientId ? { ...st, collapsed: !st.collapsed } : st) } : s
        ))
    }

    // Save weight for exercise
    async function saveWeight(tabId: string, studentIdx: number, workoutId: string, weekIdx: number, sessionIdx: number, blockIdx: number, exerciseIdx: number, weight: string) {
        const key = `${tabId}-${studentIdx}-${blockIdx}-${exerciseIdx}`
        setSavingWeightKey(key)
        try {
            await fetch(`/api/studio/workouts/${workoutId}/exercise-weight`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekIdx, sessionIdx, blockIdx, exerciseIdx, weight: weight || null }),
            })
            setSessions(prev => prev.map(s => {
                if (s.id !== tabId) return s
                return {
                    ...s, students: s.students.map((st, idx) => {
                        if (idx !== studentIdx || !st.sessionData) return st
                        const session = JSON.parse(JSON.stringify(st.sessionData.session))
                        if (session.blocks?.[blockIdx]?.exercises?.[exerciseIdx])
                            session.blocks[blockIdx].exercises[exerciseIdx].weight = weight || null
                        if (session.exercises) {
                            const flatEx = session.exercises.find((e: any) => e.blockIdx === blockIdx && e.exerciseIdx === exerciseIdx)
                            if (flatEx) flatEx.weight = weight || null
                        }
                        return { ...st, sessionData: { ...st.sessionData, session } }
                    })
                }
            }))
        } catch (err) { console.error('Error saving weight:', err) }
        finally { setSavingWeightKey(null) }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================
    const levelLabel = (l?: string) => l === 'INTERMEDIARIO' ? 'Intermediário' : l === 'AVANCADO' ? 'Avançado' : 'Iniciante'
    const pillarColor = (p: string) => {
        const l = p?.toLowerCase() || ''
        if (l.includes('lower') || l.includes('inferior')) return 'bg-blue-500'
        if (l.includes('push') || l.includes('empurr')) return 'bg-red-500'
        if (l.includes('pull') || l.includes('pux')) return 'bg-green-500'
        return 'bg-amber-500'
    }
    const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

    // ========================================================================
    // RENDER — SESSION VIEW (when a tab is active)
    // ========================================================================
    if (activeSession) {
        const studentsNotInSession = allClients.filter(c =>
            !activeSession.students.some(s => s.client.id === c.id)
        )

        return (
            <div className="space-y-3">
                {/* Tab Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9"
                        onClick={() => setActiveTabId(null)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    {sessions.map(tab => (
                        <button
                            key={tab.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab.id === activeTabId
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                                }`}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            <Users className="w-3.5 h-3.5" />
                            {tab.label}
                            <span className="ml-1 hover:text-red-400"
                                onClick={(e) => { e.stopPropagation(); closeSession(tab.id) }}>
                                <X className="w-3 h-3" />
                            </span>
                        </button>
                    ))}

                    <Button variant="ghost" size="sm" className="text-xs flex-shrink-0 text-muted-foreground"
                        onClick={() => setActiveTabId(null)}>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Nova
                    </Button>
                </div>

                {/* Session Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold">Sessão {activeSession.label}</h2>
                            <p className="text-xs text-muted-foreground">
                                {activeSession.students.filter(s => s.checkedIn).length}/{activeSession.students.length} check-ins • {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add Late Student */}
                {studentsNotInSession.length > 0 && (
                    <details className="group">
                        <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar aluno atrasado ({studentsNotInSession.length})
                        </summary>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                            {studentsNotInSession.slice(0, 20).map(c => (
                                <Button key={c.id} variant="outline" size="sm" className="text-xs justify-start h-8"
                                    onClick={() => addLateStudent(c, activeSession.id)}>
                                    <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{c.name}</span>
                                </Button>
                            ))}
                        </div>
                    </details>
                )}

                {/* Workout Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {activeSession.students.map((student, studentIdx) => (
                        <Card key={student.client.id} className={`overflow-hidden transition-all ${student.checkedIn ? 'border-green-500/30' : student.error ? 'border-red-500/30' : ''
                            }`}>
                            {/* Card Header */}
                            <div className={`px-3 py-2 flex items-center justify-between cursor-pointer ${student.checkedIn ? 'bg-green-500/5' : student.error ? 'bg-red-500/5' : 'bg-muted/20'
                                }`} onClick={() => toggleCollapse(activeSession.id, student.client.id)}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${student.checkedIn ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
                                        }`}>{initials(student.client.name)}</div>
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
                                    {student.collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Card Body */}
                            {!student.collapsed && (
                                <div>
                                    {student.loading && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                        </div>
                                    )}

                                    {student.error && (
                                        <div className="px-3 py-4 text-center">
                                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                            <p className="text-xs text-red-400">{student.error}</p>
                                            <Button variant="ghost" size="sm" className="text-xs mt-1"
                                                onClick={() => removeFromSession(activeSession.id, student.client.id)}>Remover</Button>
                                        </div>
                                    )}

                                    {student.sessionData && !student.loading && (
                                        <div className="divide-y divide-muted/30">
                                            {/* Progress + attendance */}
                                            <div className="px-3 py-1.5">
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                                    <span>{student.sessionData.session.periodization?.phaseLabel || student.sessionData.progress.currentPhaseLabel}</span>
                                                    <span>Sem. {student.sessionData.progress.currentWeek}</span>
                                                </div>
                                                {/* 85% attendance bar */}
                                                {(() => {
                                                    const pct = Math.round((student.sessionData.progress.attendanceRate ?? 0) * 100)
                                                    const status = student.sessionData.progress.attendanceStatus
                                                    const barColor = status === 'ON_TRACK' ? 'bg-green-500' : status === 'BELOW_TARGET' ? 'bg-yellow-500' : 'bg-red-500'
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${status === 'ON_TRACK' ? 'text-green-500' : status === 'BELOW_TARGET' ? 'text-yellow-500' : 'text-red-500'}`}>
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
                                                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                                                    <span>{student.sessionData.progress.sessionsCompleted} sessões</span>
                                                    <span>Meta: 85%</span>
                                                </div>
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
                                                            <ExerciseRow key={eIdx} ex={ex} savingKey={savingWeightKey}
                                                                onSave={(w) => saveWeight(activeSession.id, studentIdx, student.workoutId,
                                                                    (student.sessionData!.progress.currentWeek || 1) - 1,
                                                                    student.sessionData!.session.dayIndex, bIdx, eIdx, w)}
                                                                uniqueKey={`${activeSession.id}-${studentIdx}-${bIdx}-${eIdx}`}
                                                            />
                                                        ))}
                                                    </div>
                                                ))
                                                : (
                                                    <div className="px-3 py-1.5">
                                                        {(student.sessionData.session.exercises || []).map((ex, i) => (
                                                            <ExerciseRow key={i} ex={ex} savingKey={savingWeightKey}
                                                                onSave={(w) => saveWeight(activeSession.id, studentIdx, student.workoutId,
                                                                    (student.sessionData!.progress.currentWeek || 1) - 1,
                                                                    student.sessionData!.session.dayIndex, ex.blockIdx ?? 0, ex.exerciseIdx ?? i, w)}
                                                                uniqueKey={`${activeSession.id}-${studentIdx}-${ex.blockIdx ?? 0}-${ex.exerciseIdx ?? i}`}
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
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // ========================================================================
    // RENDER — SELECTION MODE (checkboxes + start session)
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Presença</h1>
                    <p className="text-sm text-muted-foreground">
                        Selecione os alunos e inicie a sessão em grupo
                    </p>
                </div>
            </div>

            {/* Active sessions tabs (if any) */}
            {sessions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-muted-foreground flex-shrink-0">Sessões ativas:</span>
                    {sessions.map(tab => (
                        <button key={tab.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/30 whitespace-nowrap flex-shrink-0 hover:bg-green-500/20 transition-colors"
                            onClick={() => setActiveTabId(tab.id)}>
                            <Users className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Search + Controls */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Pesquisar aluno por nome ou email..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10" autoFocus />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                                Selecionar Todos
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deselectAll}
                                className="text-xs" disabled={selectedIds.size === 0}>Limpar</Button>
                        </div>
                        {selectedIds.size > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Client List */}
            <div className="space-y-1">
                {loadingClients ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : clients.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno ativo'}
                        </CardContent>
                    </Card>
                ) : (
                    clients.map((client) => {
                        const isSelected = selectedIds.has(client.id)
                        // Check if already in any active session
                        const inSession = sessions.some(s => s.students.some(st => st.client.id === client.id))
                        return (
                            <div key={client.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-green-500/50 bg-green-500/5'
                                        : inSession ? 'border-blue-500/30 bg-blue-500/5 opacity-60'
                                            : 'border-transparent hover:border-muted hover:bg-muted/20'
                                    }`}
                                onClick={() => !inSession && toggleSelect(client.id)}>
                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-green-500 border-green-500'
                                        : inSession ? 'bg-blue-500/30 border-blue-500/50'
                                            : 'border-muted-foreground/50'
                                    }`}>
                                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    {inSession && !isSelected && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-amber-500 font-bold text-xs">{initials(client.name)}</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{client.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{client.email || 'Sem email'}</p>
                                </div>

                                {/* Badge */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {inSession && <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400">Em sessão</Badge>}
                                    {client.level && <Badge variant="outline" className="text-[10px]">{levelLabel(client.level)}</Badge>}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Start Session FAB */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button onClick={startGroupSession} disabled={startingSession} size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-2xl rounded-full px-8 h-14 text-lg gap-2">
                        {startingSession ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                        Iniciar Sessão ({selectedIds.size})
                    </Button>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// EXERCISE ROW — inline editable weight
// ============================================================================
function ExerciseRow({ ex, savingKey, uniqueKey, onSave }: {
    ex: SessionExercise; savingKey: string | null; uniqueKey: string
    onSave: (weight: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(ex.weight || '')
    const isSaving = savingKey === uniqueKey

    const icon = ex.role === 'FOCO_PRINCIPAL' ? '🎯' : ex.role === 'SECUNDARIO' ? '🔄' : '⚡'

    function handleSave() { onSave(val); setEditing(false) }

    return (
        <div className="flex items-center gap-1.5 py-1">
            <span className="text-[10px] w-3">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} · {ex.rest}</p>
            </div>
            {editing ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <input type="text" className="w-14 h-6 text-xs text-center rounded border bg-background px-1" value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                        autoFocus placeholder="kg" />
                    <button className="text-green-500 hover:text-green-400" onClick={handleSave} disabled={isSaving}>
                        <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                <button className={`h-6 px-1.5 rounded text-[10px] font-mono flex items-center gap-0.5 flex-shrink-0 transition-colors ${ex.weight ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`} onClick={() => { setVal(ex.weight || ''); setEditing(true) }} title="Editar carga">
                    <Weight className="w-3 h-3" />{ex.weight || '—'}
                </button>
            )}
        </div>
    )
}
