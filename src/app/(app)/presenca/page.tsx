'use client'

// ============================================================================
// EXPERT PRO TRAINING - PRESENÇA (CHECK-IN) + SESSÃO EM GRUPO (SERVER-SIDE)
// ============================================================================
// - Sessions stored server-side → sync across devices
// - Per-trainer isolation: each trainer sees only their sessions
// - Cross-trainer: students in any session show "em sessão" badge
// - Check-in only on "Finalizar Sessão"
// - Polls every 10s for session updates
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
    UserCheck, Search, Loader2, CheckCircle, AlertCircle,
    Users, Plus, X, ChevronDown, ChevronUp, Weight,
    ArrowLeft, UserPlus, Flag, AlertTriangle, CreditCard,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================
interface Client {
    id: string; name: string; email: string | null; status: string; level?: string
    isActive?: boolean; inactiveReason?: 'PAYMENT' | 'MANUAL' | null
}

interface SessionExercise {
    name: string; sets: number; reps: string; rest: string; role: string
    weight?: string | null; blockIdx?: number; exerciseIdx?: number
}

interface AvailableSession {
    index: number; pillarLabel: string; pillar: string
}

interface SessionData {
    session: {
        dayIndex: number; pillarLabel: string; exercises: SessionExercise[]
        periodization: { phase: string; phaseLabel: string; week: number }
        preparation?: any
        blocks?: Array<{ code: string; name: string; exercises: SessionExercise[] }>
        finalProtocol?: any
        isGestante?: boolean
        gestanteSession?: any
        trimester?: string
        gestationalWeeksRange?: string
        maxHeartRate?: number
    }
    progress: {
        attendanceRate: number; attendanceRateLabel: string; attendanceStatus: string
        currentWeek: number; currentPhaseLabel: string
        sessionsCompleted: number; sessionsExpectedByNow: number
        sessionsPerWeek: number; targetWeeks: number; sessionsForMinimumPhase: number
        calendarWeeks: number
        canReassess: boolean; mustExtend: boolean; isComplete: boolean
    }
    client: { id: string; name: string }; workoutName: string; checkedInToday?: boolean
    availableSessions?: AvailableSession[]
    firstLessonDate?: string | null
    weekLessons?: string[]   // ISO dates das presenças nesta semana
    todayLesson?: { id: string; date: string; startedAt: string; endedAt: string; focus: string | null; sessionIndex: number; weekIndex: number } | null
    lastLesson?: { id: string; date: string; focus: string | null; sessionIndex: number } | null
}

interface StudentEntry { clientId: string; workoutId: string; clientName: string }

interface ServerSession {
    id: string; label: string; students: StudentEntry[]
    createdAt: string; finalized: boolean
}

// Local state per student card
interface StudentCard {
    entry: StudentEntry
    sessionData: SessionData | null
    loading: boolean; checkedIn: boolean; error: string | null; collapsed: boolean
    selectedPillarIndex?: number | null
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

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [startingSession, setStartingSession] = useState(false)

    // Server sessions
    const [serverSessions, setServerSessions] = useState<ServerSession[]>([])
    const [activeTabId, setActiveTabId] = useState<string | null>(null)
    const [loadingSessions, setLoadingSessions] = useState(true)

    // Student cards (populated client-side from next-session API)
    const [cardsBySession, setCardsBySession] = useState<Map<string, StudentCard[]>>(new Map())
    const cardsBySessionRef = useRef<Map<string, StudentCard[]>>(new Map())

    // Pillar overrides — persists selected pillar per client across polling
    // Key: clientId, Value: sessionIndex
    const pillarOverridesRef = useRef<Map<string, number>>(new Map())

    // Active clients in studio (cross-trainer)
    const activeClientIds = useRef<Map<string, string>>(new Map()) // clientId → trainerId
    const [activeClientIdsState, setActiveClientIdsState] = useState<Map<string, string>>(new Map())

    // UI
    const [showAddStudent, setShowAddStudent] = useState(false)
    const [addStudentSearch, setAddStudentSearch] = useState('')
    const [finalizingSession, setFinalizingSession] = useState(false)
    const [savingWeightKey, setSavingWeightKey] = useState<string | null>(null)
    const [clearingStuck, setClearingStuck] = useState(false)
    const [mensAlertIds, setMensAlertIds] = useState<Set<string>>(new Set())
    // clientId -> status completo de mensalidade
    type MensStatus = 'no_plan' | 'pending' | 'overdue' | 'upcoming' | 'active'
    const [mensStatusMap, setMensStatusMap] = useState<Map<string, MensStatus>>(new Map())

    // Modal de confirmação de pagamento pendente ao iniciar sessão
    const [paymentWarningModal, setPaymentWarningModal] = useState<{
        no_plan:  { id: string; name: string }[]
        pending:  { id: string; name: string }[]
        overdue:  { id: string; name: string }[]
        upcoming: { id: string; name: string }[]
        forceStart: () => void
    } | null>(null)

    const activeSession = serverSessions.find(s => s.id === activeTabId) || null
    const activeCards = activeTabId ? (cardsBySession.get(activeTabId) || []) : []

    // Keep ref in sync with state
    useEffect(() => { cardsBySessionRef.current = cardsBySession }, [cardsBySession])

    // ========================================================================
    // DATA LOADING
    // ========================================================================
    useEffect(() => { loadClients(); loadSessions(); loadActiveClients() }, [])

    // Buscar status COMPLETO de mensalidades de todos os alunos (com autenticação)
    useEffect(() => {
        fetchWithAuth('/api/studio/financeiro/mensalidades/status')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    type MensStatus = 'no_plan' | 'pending' | 'overdue' | 'upcoming' | 'active'
                    const statusMap = new Map<string, MensStatus>()
                    const alertIds = new Set<string>()
                    Object.entries(d.data).forEach(([clientId, info]: [string, any]) => {
                        statusMap.set(clientId, info.status as MensStatus)
                        if (info.status !== 'active') alertIds.add(clientId)
                    })
                    setMensStatusMap(statusMap)
                    setMensAlertIds(alertIds)
                }
            })
            .catch(() => {})
    }, [])

    // Poll for active sessions + active clients every 30s
    // Only update state when data actually changes to prevent scroll reset
    useEffect(() => {
        const interval = setInterval(() => { loadSessions(); loadActiveClients() }, 30000)
        return () => clearInterval(interval)
    }, [])

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
            // 1. Carrega clientes via workouts (para associar ao treino)
            const res = await fetchWithAuth('/api/studio/workouts?status=ACTIVE&pageSize=500')
            const data = await res.json()
            const cMap = new Map<string, Client>()
            const wMap = new Map<string, string>()
            if (data.success) {
                const items = data.data?.items || data.data || []
                for (const w of items) {
                    if (w.isActive && w.client && !cMap.has(w.client.id)) {
                        cMap.set(w.client.id, { id: w.client.id, name: w.client.name, email: w.client.email || null, status: 'ACTIVE', level: w.client.level, isActive: true })
                        wMap.set(w.client.id, w.id)
                    }
                }
            }
            // 2. Complementa com TODOS os clientes (ativos + inativos) para que
            //    inativos também apareçam em presenç a com badge de aviso
            const resAll = await fetchWithAuth('/api/clients?pageSize=500&page=1')
            const dataAll = await resAll.json()
            if (dataAll.success) {
                for (const c of (dataAll.data?.items || [])) {
                    if (!cMap.has(c.id)) {
                        cMap.set(c.id, { id: c.id, name: c.name, email: c.email || null, status: c.isActive ? 'ACTIVE' : 'INACTIVE', level: c.level, isActive: c.isActive, inactiveReason: c.inactiveReason })
                    } else {
                        // Atualiza o isActive do registro já existente
                        const existing = cMap.get(c.id)!
                        cMap.set(c.id, { ...existing, isActive: c.isActive, inactiveReason: c.inactiveReason })
                    }
                }
            }
            const sorted = Array.from(cMap.values()).sort((a, b) => a.name.localeCompare(b.name))
            setAllClients(sorted); setClients(sorted); setClientWorkoutMap(wMap)
        } catch (err) { console.error(err) }
        finally { setLoadingClients(false) }
    }

    async function loadSessions() {
        try {
            const res = await fetchWithAuth('/api/studio/training-sessions')
            const data = await res.json()
            if (data.success) {
                const sessions = data.data as ServerSession[]
                // Only update state if data actually changed (prevents scroll reset)
                setServerSessions(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(sessions)) return prev
                    return sessions
                })

                // Auto-load card data for any session that doesn't have it yet
                for (const session of sessions) {
                    if (!cardsBySessionRef.current.get(session.id)) {
                        loadSessionCards(session)
                    }
                }
            }
        } catch (err) { console.error(err) }
        finally { setLoadingSessions(false) }
    }

    async function loadActiveClients() {
        try {
            const res = await fetchWithAuth('/api/studio/training-sessions/active-clients')
            const data = await res.json()
            if (data.success) {
                const map = new Map<string, string>()
                for (const item of data.data) { map.set(item.clientId, item.trainerId) }
                activeClientIds.current = map
                setActiveClientIdsState(map)
            }
        } catch { }
    }

    // Load workout data for all students in a session
    async function loadSessionCards(session: ServerSession) {
        const initialCards: StudentCard[] = session.students.map(entry => ({
            entry, sessionData: null, loading: true, checkedIn: false, error: null, collapsed: false,
        }))
        setCardsBySession(prev => new Map(prev).set(session.id, initialCards))

        const loaded = await Promise.all(session.students.map(async (entry) => {
            if (!entry.workoutId) return { entry, sessionData: null, loading: false, checkedIn: false, error: 'Sem treino ativo — gere um treino para este aluno', collapsed: false } as StudentCard
            try {
                // Priority: in-memory ref > stored in DB (storedSessionIndex) > auto
                const memOverride = pillarOverridesRef.current.get(entry.clientId)
                const dbOverride = (entry as any).storedSessionIndex
                const overrideIdx = memOverride !== undefined ? memOverride : dbOverride

                // Sync ref with DB value so finalize sends correct pillarOverrides
                if (overrideIdx !== undefined && memOverride === undefined) {
                    pillarOverridesRef.current.set(entry.clientId, overrideIdx)
                }

                const url = overrideIdx !== undefined
                    ? `/api/studio/workouts/${entry.workoutId}/next-session?sessionIndex=${overrideIdx}`
                    : `/api/studio/workouts/${entry.workoutId}/next-session`
                const res = await fetchWithAuth(url)

                // 404: workout was deleted or is no longer active
                if (res.status === 404) {
                    return { entry, sessionData: null, loading: false, checkedIn: false, error: 'Treino não encontrado — gere um novo treino para este aluno', collapsed: false } as StudentCard
                }

                const data = await res.json()
                if (!data.success) {
                    // legacyWorkout or template missing — informative message
                    const msg = data.legacyWorkout
                        ? 'Treino em formato antigo — gere um novo treino'
                        : (data.error || 'Erro ao carregar treino')
                    return { entry, sessionData: null, loading: false, checkedIn: false, error: msg, collapsed: false } as StudentCard
                }
                const sd = data.data as SessionData
                return { entry, sessionData: sd, loading: false, checkedIn: sd.checkedInToday || false, error: null, collapsed: false, selectedPillarIndex: overrideIdx } as StudentCard
            } catch { return { entry, sessionData: null, loading: false, checkedIn: false, error: 'Erro de conexão', collapsed: false } as StudentCard }
        }))

        setCardsBySession(prev => new Map(prev).set(session.id, loaded))
    }

    // ========================================================================
    // SELECTION
    // ========================================================================
    function toggleSelect(id: string) {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }
    function selectAll() { setSelectedIds(new Set(clients.filter(c => !activeClientIdsState.has(c.id)).map(c => c.id))) }
    function deselectAll() { setSelectedIds(new Set()) }

    async function clearStuckSessions() {
        if (!confirm('Isso vai remover TODAS as sessões em aberto sem registrar presença. Continuar?')) return
        setClearingStuck(true)
        try {
            const res = await fetchWithAuth('/api/studio/training-sessions', { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setServerSessions([])
                setCardsBySession(new Map())
                setActiveTabId(null)
                pillarOverridesRef.current.clear()
                await loadSessions()
                await loadActiveClients()
                alert(data.message || 'Sessões limpas.')
            } else {
                alert(data.error || 'Erro ao limpar sessões')
            }
        } catch { alert('Erro de conexão') }
        finally { setClearingStuck(false) }
    }

    // ========================================================================
    // SESSION MANAGEMENT — Server-side
    // ========================================================================
    // Executa a criação da sessão de fato (após confirmação se necessário)
    async function doStartGroupSession(idsToStart: string[]) {
        setStartingSession(true)
        const selected = allClients.filter(c => idsToStart.includes(c.id))
        const students: StudentEntry[] = selected.map(c => ({
            clientId: c.id,
            workoutId: clientWorkoutMap.get(c.id) || '',
            clientName: c.name,
        }))
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        try {
            const res = await fetchWithAuth('/api/studio/training-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students, label: `${time} · ${selected.length} ${selected.length === 1 ? 'aluno' : 'alunos'}` }),
            })
            const data = await res.json()
            if (data.success) {
                const newSession = data.data as ServerSession
                setServerSessions(prev => [...prev, newSession])
                setActiveTabId(newSession.id)
                setSelectedIds(new Set())
                loadSessionCards(newSession)
                loadActiveClients()
            } else {
                alert(data.error || 'Erro ao criar sessão')
            }
        } catch (err) { alert('Erro de conexão') }
        finally { setStartingSession(false) }
    }

    async function startGroupSession() {
        const selected = allClients.filter(c => selectedIds.has(c.id))
        const selectedIds_list = selected.map(c => c.id)

        // Verificar status COMPLETO de mensalidades dos alunos selecionados
        const no_plan = selected.filter(c => mensStatusMap.get(c.id) === 'no_plan')
        const pending  = selected.filter(c => mensStatusMap.get(c.id) === 'pending')
        const overdue  = selected.filter(c => mensStatusMap.get(c.id) === 'overdue')
        const upcoming = selected.filter(c => mensStatusMap.get(c.id) === 'upcoming')

        // Só exibe modal se o mapa já foi carregado (tem dados)
        const hasData = mensStatusMap.size > 0

        if (hasData && (no_plan.length > 0 || pending.length > 0 || overdue.length > 0 || upcoming.length > 0)) {
            setPaymentWarningModal({
                no_plan:  no_plan.map(c => ({ id: c.id, name: c.name })),
                pending:  pending.map(c => ({ id: c.id, name: c.name })),
                overdue:  overdue.map(c => ({ id: c.id, name: c.name })),
                upcoming: upcoming.map(c => ({ id: c.id, name: c.name })),
                forceStart: () => {
                    setPaymentWarningModal(null)
                    doStartGroupSession(selectedIds_list)
                },
            })
            return
        }

        // Todos em dia ou mapa sem dados → inicia normalmente
        await doStartGroupSession(selectedIds_list)
    }

    async function addLateStudent(client: Client) {
        if (!activeTabId || !activeSession) return
        const workoutId = clientWorkoutMap.get(client.id)
        if (!workoutId) return
        setShowAddStudent(false); setAddStudentSearch('')

        const entry: StudentEntry = { clientId: client.id, workoutId, clientName: client.name }

        try {
            const res = await fetchWithAuth(`/api/studio/training-sessions/${activeTabId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addStudent: entry }),
            })
            const data = await res.json()
            if (!data.success) { alert(data.error || 'Erro'); return }

            // Update server sessions
            setServerSessions(prev => prev.map(s => s.id === activeTabId ? { ...s, students: data.data.students } : s))
            loadActiveClients()

            // Load workout data for new student
            const newCard: StudentCard = { entry, sessionData: null, loading: true, checkedIn: false, error: null, collapsed: false }
            setCardsBySession(prev => {
                const m = new Map(prev)
                const cards = m.get(activeTabId!) || []
                m.set(activeTabId!, [...cards, newCard])
                return m
            })

            try {
                const wRes = await fetchWithAuth(`/api/studio/workouts/${workoutId}/next-session`)
                const wData = await wRes.json()
                const card: StudentCard = wData.success
                    ? { entry, sessionData: wData.data, loading: false, checkedIn: wData.data.checkedInToday || false, error: null, collapsed: false }
                    : { entry, sessionData: null, loading: false, checkedIn: false, error: wData.error || 'Erro', collapsed: false }
                setCardsBySession(prev => {
                    const m = new Map(prev)
                    const cards = m.get(activeTabId!) || []
                    m.set(activeTabId!, cards.map(c => c.entry.clientId === client.id ? card : c))
                    return m
                })
            } catch { }
        } catch { alert('Erro de conexão') }
    }

    async function removeFromSession(clientId: string) {
        if (!activeTabId) return
        try {
            const res = await fetchWithAuth(`/api/studio/training-sessions/${activeTabId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removeClientId: clientId }),
            })
            const data = await res.json()
            if (data.success) {
                setServerSessions(prev => prev.map(s => s.id === activeTabId ? { ...s, students: data.data.students } : s))
                setCardsBySession(prev => {
                    const m = new Map(prev)
                    const cards = m.get(activeTabId!) || []
                    m.set(activeTabId!, cards.filter(c => c.entry.clientId !== clientId))
                    return m
                })
                loadActiveClients()
            }
        } catch { }
    }

    async function finalizeSession() {
        if (!activeTabId) return
        setFinalizingSession(true)
        try {
            // Build pillarOverrides map: clientId → sessionIndex (from manual selections)
            const pillarOverridesMap: Record<string, number> = {}
            Array.from(pillarOverridesRef.current.entries()).forEach(([clientId, sessionIndex]) => {
                pillarOverridesMap[clientId] = sessionIndex
            })

            const res = await fetchWithAuth(`/api/studio/training-sessions/${activeTabId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pillarOverrides: pillarOverridesMap }),
            })
            const data = await res.json()
            if (data.success) {
                // Update cards to show checked-in
                setCardsBySession(prev => {
                    const m = new Map(prev)
                    const cards = m.get(activeTabId!) || []
                    const checkedIds = new Set(data.data.results.filter((r: any) => r.checkedIn).map((r: any) => r.clientId))
                    m.set(activeTabId!, cards.map(c => checkedIds.has(c.entry.clientId) ? { ...c, checkedIn: true } : c))
                    return m
                })
                // Mark finalized
                setServerSessions(prev => prev.map(s => s.id === activeTabId ? { ...s, finalized: true } : s))
                // After 2s, remove tab
                setTimeout(() => {
                    setServerSessions(prev => prev.filter(s => s.id !== activeTabId))
                    setCardsBySession(prev => { const m = new Map(prev); m.delete(activeTabId!); return m })
                    const remaining = serverSessions.filter(s => s.id !== activeTabId && !s.finalized)
                    setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
                    loadActiveClients()
                }, 2500)
            }
        } catch (err) { alert('Erro ao finalizar') }
        finally { setFinalizingSession(false) }
    }

    async function closeSession(tabId: string) {
        try {
            await fetchWithAuth(`/api/studio/training-sessions/${tabId}`, { method: 'DELETE' })
        } catch { }
        setServerSessions(prev => prev.filter(s => s.id !== tabId))
        setCardsBySession(prev => { const m = new Map(prev); m.delete(tabId); return m })
        if (activeTabId === tabId) {
            const remaining = serverSessions.filter(s => s.id !== tabId)
            setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
        }
        loadActiveClients()
    }

    function toggleCollapse(clientId: string) {
        if (!activeTabId) return
        setCardsBySession(prev => {
            const m = new Map(prev)
            const cards = m.get(activeTabId!) || []
            m.set(activeTabId!, cards.map(c => c.entry.clientId === clientId ? { ...c, collapsed: !c.collapsed } : c))
            return m
        })
    }

    // Switch pillar/session for a specific student card
    async function switchPillar(cardIdx: number, workoutId: string, sessionIndex: number) {
        if (!activeTabId) return
        const cards = cardsBySession.get(activeTabId) || []
        const clientId = cards[cardIdx]?.entry.clientId

        // Store the override so it persists across polling
        if (clientId) {
            pillarOverridesRef.current.set(clientId, sessionIndex)
        }

        try {
            // 1. Fetch the chosen session data
            const res = await fetchWithAuth(`/api/studio/workouts/${workoutId}/next-session?sessionIndex=${sessionIndex}`)
            const data = await res.json()
            if (!data.success) return

            const sd = data.data as SessionData
            setCardsBySession(prev => {
                const m = new Map(prev)
                const cards = [...(m.get(activeTabId!) || [])]
                if (cards[cardIdx]) {
                    cards[cardIdx] = { ...cards[cardIdx], sessionData: sd, selectedPillarIndex: sessionIndex }
                }
                m.set(activeTabId!, cards)
                return m
            })

            // 2. Persist pillar override in DB so it survives polling / page reload
            fetchWithAuth(`/api/studio/training-sessions/${activeTabId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pillarOverride: { clientId, sessionIndex } }),
            }).catch(err => console.error('Persist pillar error:', err))

        } catch (err) { console.error('Switch pillar error:', err) }
    }

    async function saveWeight(studentIdx: number, workoutId: string, weekIdx: number, sessionIdx: number, blockIdx: number, exerciseIdx: number, weight: string) {
        if (!activeTabId) return
        const key = `${activeTabId}-${studentIdx}-${blockIdx}-${exerciseIdx}`
        setSavingWeightKey(key)
        try {
            await fetchWithAuth(`/api/studio/workouts/${workoutId}/exercise-weight`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekIdx, sessionIdx, blockIdx, exerciseIdx, weight: weight || null }),
            })
            setCardsBySession(prev => {
                const m = new Map(prev)
                const cards = m.get(activeTabId!) || []
                m.set(activeTabId!, cards.map((c, idx) => {
                    if (idx !== studentIdx || !c.sessionData) return c
                    const session = JSON.parse(JSON.stringify(c.sessionData.session))
                    if (session.blocks?.[blockIdx]?.exercises?.[exerciseIdx]) session.blocks[blockIdx].exercises[exerciseIdx].weight = weight || null
                    if (session.exercises) {
                        const flatEx = session.exercises.find((e: any) => e.blockIdx === blockIdx && e.exerciseIdx === exerciseIdx)
                        if (flatEx) flatEx.weight = weight || null
                    }
                    return { ...c, sessionData: { ...c.sessionData, session } }
                }))
                return m
            })
        } catch (err) { console.error(err) }
        finally { setSavingWeightKey(null) }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================
    const levelLabel = (l?: string) => l === 'INTERMEDIARIO' ? 'Intermediário' : l === 'AVANCADO' ? 'Avançado' : 'Iniciante'
    const pillarBg = (p: string) => {
        const l = p?.toLowerCase() || ''
        if (l.includes('lower') || l.includes('inferior')) return 'bg-yellow-500/15 text-yellow-600'
        if (l.includes('push') || l.includes('empurr')) return 'bg-red-500/10 text-red-400'
        if (l.includes('pull') || l.includes('pux')) return 'bg-green-500/10 text-green-400'
        return 'bg-amber-500/10 text-amber-400'
    }
    const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

    // ========================================================================
    // RENDER — SESSION VIEW
    // ========================================================================
    if (activeSession) {
        const isFinalized = activeSession.finalized
        const studentsNotInSession = allClients.filter(c =>
            !activeSession.students.some(s => s.clientId === c.id) && !activeClientIdsState.has(c.id)
        )
        const filteredAdd = addStudentSearch
            ? studentsNotInSession.filter(c => c.name.toLowerCase().includes(addStudentSearch.toLowerCase()))
            : studentsNotInSession

        return (
            <div className="space-y-3 pb-24">
                {/* TAB BAR */}
                <div className="sticky top-0 z-40 -mx-4 px-4 py-2 bg-background/80 backdrop-blur-lg border-b border-muted/30">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <button className="flex-shrink-0 w-9 h-9 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                            onClick={() => setActiveTabId(null)}>
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        {serverSessions.filter(s => !s.finalized).map(tab => (
                            <button key={tab.id}
                                className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${tab.id === activeTabId
                                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/10'
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                                    }`}
                                onClick={() => setActiveTabId(tab.id)}>
                                <div className={`w-2 h-2 rounded-full ${tab.id === activeTabId ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/50'}`} />
                                <Users className="w-3.5 h-3.5" />
                                {tab.label}
                                <button className="ml-1 w-5 h-5 rounded-full bg-red-500/15 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                                    onClick={(e) => { e.stopPropagation(); closeSession(tab.id) }}
                                    title="Cancelar sessão">
                                    <X className="w-3 h-3 text-red-500" />
                                </button>
                            </button>
                        ))}

                        <button className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                            onClick={() => setActiveTabId(null)}>
                            <Plus className="w-3.5 h-3.5" /> Nova Sessão
                        </button>
                    </div>
                </div>

                {/* Session Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Sessão {activeSession.label}</h2>
                        <p className="text-xs text-muted-foreground">
                            {activeSession.students.length} {activeSession.students.length === 1 ? 'aluno' : 'alunos'} • {new Date().toLocaleDateString('pt-BR')}
                            {activeCards.some(s => s.loading) && (
                                <span className="ml-2 text-amber-400 animate-pulse">⏳ carregando...</span>
                            )}
                            {isFinalized && <span className="text-green-500 font-bold ml-2">✅ Finalizada!</span>}
                        </p>
                    </div>
                </div>

                {/* Finalized message */}
                {isFinalized && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-green-500 font-bold">Sessão finalizada com sucesso!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Check-in registrado para {activeCards.filter(s => s.checkedIn).length} alunos
                        </p>
                    </div>
                )}

                {/* Add Student Modal */}
                {showAddStudent && !isFinalized && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
                        <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-sm">Adicionar Aluno Atrasado</h3>
                                <button onClick={() => { setShowAddStudent(false); setAddStudentSearch('') }}>
                                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </button>
                            </div>
                            <div className="p-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Buscar aluno..." value={addStudentSearch}
                                        onChange={(e) => setAddStudentSearch(e.target.value)} className="pl-10" autoFocus />
                                </div>
                            </div>
                            <div className="overflow-y-auto max-h-[50vh] px-3 pb-3 space-y-1">
                                {filteredAdd.length === 0 ? (
                                    <p className="text-center text-xs text-muted-foreground py-4">Nenhum aluno disponível</p>
                                ) : filteredAdd.slice(0, 30).map(c => (
                                    <button key={c.id} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                                        onClick={() => addLateStudent(c)}>
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-amber-500 font-bold text-xs">{initials(c.name)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                                {c.name}
                                                {/* Badge de inativo manual */}
                                                {c.isActive === false && c.inactiveReason !== 'PAYMENT' && (
                                                    <span className="flex-shrink-0 text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-1.5 py-0.5 font-bold">INATIVO</span>
                                                )}
                                                {mensStatusMap.get(c.id) === 'overdue' && (
                                                    <span className="flex-shrink-0 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-bold">INAD</span>
                                                )}
                                                {mensStatusMap.get(c.id) === 'upcoming' && (
                                                    <span className="flex-shrink-0 text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-1.5 py-0.5">$ 3d</span>
                                                )}
                                            </p>
                                        </div>
                                        <Plus className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Workout Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {activeCards.map((card, cardIdx) => (
                        <Card key={card.entry.clientId} className={`overflow-hidden transition-all ${card.checkedIn ? 'border-green-500/30' : card.error ? 'border-red-500/30' : ''
                            }`}>
                            {/* Card Header */}
                            <div className={`px-3 py-2 flex items-center justify-between cursor-pointer ${card.checkedIn ? 'bg-green-500/5' : card.error ? 'bg-red-500/5' : 'bg-muted/20'
                                }`} onClick={() => toggleCollapse(card.entry.clientId)}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${card.checkedIn ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>{initials(card.entry.clientName)}</div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                            {card.entry.clientName}
                                            {mensStatusMap.get(card.entry.clientId) === 'overdue' && (
                                                <span className="flex-shrink-0 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-bold">
                                                    INAD
                                                </span>
                                            )}
                                            {mensStatusMap.get(card.entry.clientId) === 'upcoming' && (
                                                <span className="flex-shrink-0 text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-1.5 py-0.5">
                                                    $ 3d
                                                </span>
                                            )}
                                        </p>
                                        {/* Last pillar chip — more visible */}
                                        {card.sessionData?.lastLesson?.focus && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] text-muted-foreground">↩ Último:</span>
                                                <span className="text-[9px] font-bold px-1.5 py-0 h-4 rounded-full bg-orange-500/20 text-orange-400 inline-flex items-center">
                                                    {card.sessionData.lastLesson.focus}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground">
                                                    {new Date(card.sessionData.lastLesson.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        {card.sessionData && (
                                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                                {/* Lock badge when manually overridden */}
                                                {pillarOverridesRef.current.has(card.entry.clientId) && (
                                                    <span className="text-[9px] px-1 py-0 h-4 rounded-full font-bold bg-yellow-500/15 text-yellow-600 inline-flex items-center">
                                                        🔒
                                                    </span>
                                                )}
                                                {(() => {
                                                    const sessions = card.sessionData.availableSessions || []
                                                    const uniquePillars = sessions.reduce((acc, s) => {
                                                        if (!acc.find(p => p.pillarLabel === s.pillarLabel)) acc.push(s)
                                                        return acc
                                                    }, [] as typeof sessions)
                                                    return uniquePillars.length > 1
                                                        ? uniquePillars.map((as) => (
                                                            <button key={as.index}
                                                                className={`text-[9px] px-1.5 py-0 h-4 rounded-full font-semibold transition-all ${card.sessionData!.session.pillarLabel === as.pillarLabel
                                                                    ? pillarBg(as.pillarLabel) + ' ring-1 ring-white/30'
                                                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                                                                    }`}
                                                                onClick={(e) => { e.stopPropagation(); switchPillar(cardIdx, card.entry.workoutId, as.index) }}
                                                                title={`Trocar para ${as.pillarLabel}`}>
                                                                {as.pillarLabel}
                                                            </button>
                                                        ))
                                                        : <Badge className={`text-[9px] px-1.5 py-0 h-4 ${pillarBg(card.sessionData.session.pillarLabel)}`}>
                                                            {card.sessionData.session.pillarLabel}
                                                        </Badge>
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {card.checkedIn && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {card.loading && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
                                    {card.error && <AlertCircle className="w-4 h-4 text-red-500" />}
                                    {!isFinalized && (
                                        <button className="ml-1 text-muted-foreground/50 hover:text-red-400 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); removeFromSession(card.entry.clientId) }}>
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {card.collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Card Body */}
                            {!card.collapsed && (
                                <div>
                                    {card.loading && <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>}
                                    {card.error && (
                                        <div className="px-3 py-4 text-center">
                                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                                            <p className="text-xs text-red-400">{card.error}</p>
                                        </div>
                                    )}
                                    {card.sessionData && !card.loading && (
                                        <div className="divide-y divide-muted/30">
                                            {/* ── Painel de Frequência ── */}
                                            <div className="px-3 py-2.5">
                                                {(() => {
                                                    const prog = card.sessionData!.progress
                                                    const pct = Math.round((prog.attendanceRate ?? 0) * 100)
                                                    const st  = prog.attendanceStatus
                                                    const isOk  = st === 'ON_TRACK'
                                                    const isMid = st === 'BELOW_TARGET'
                                                    const barCl = isOk ? 'bg-emerald-500' : isMid ? 'bg-yellow-500' : 'bg-red-500'
                                                    const txtCl = isOk ? 'text-emerald-400' : isMid ? 'text-yellow-400' : 'text-red-400'
                                                    const bgCl  = isOk ? 'bg-emerald-500/8' : isMid ? 'bg-yellow-500/8' : 'bg-red-500/8'
                                                    const brdCl = isOk ? 'border-emerald-500/20' : isMid ? 'border-yellow-500/20' : 'border-red-500/20'

                                                    // Dados de frequência vindos diretamente do backend (calendarWeeks correto)
                                                    const spw       = prog.sessionsPerWeek || 3
                                                    const calWeeks  = prog.calendarWeeks || Math.round(prog.sessionsExpectedByNow / spw)
                                                    const minSess   = prog.sessionsForMinimumPhase || Math.ceil(6 * spw * 0.85)
                                                    const faltam    = Math.max(0, minSess - prog.sessionsCompleted)

                                                    // Dias da semana (Seg–Dom) e quais têm presença
                                                    const weekDayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
                                                    const weekLessons   = card.sessionData!.weekLessons || []
                                                    // Normalizar dias com presença: 0=Seg,...6=Dom
                                                    const attendedDays  = new Set(
                                                        weekLessons.map(iso => {
                                                            const d = new Date(iso)
                                                            const dow = d.getDay() // 0=Dom,1=Seg...
                                                            return dow === 0 ? 6 : dow - 1
                                                        })
                                                    )
                                                    // Dia de hoje (0=Seg...6=Dom)
                                                    const todayBRTStr = new Date().toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' })
                                                    const todayIdx = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(todayBRTStr)
                                                    const todayDayIdx = todayIdx === 0 ? 6 : todayIdx - 1

                                                    // Data de início formatada
                                                    const firstDate = card.sessionData!.firstLessonDate
                                                        ? new Date(card.sessionData!.firstLessonDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                                        : null

                                                    return (
                                                        <div className={`rounded-lg border ${brdCl} ${bgCl} p-2.5 space-y-2`}>

                                                            {/* Linha 1: título + badges + % */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Frequência</span>
                                                                    {prog.canReassess && (
                                                                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 rounded-full font-medium flex items-center gap-0.5">
                                                                            <Flag className="w-2.5 h-2.5" /> Apto p/ reavaliação
                                                                        </span>
                                                                    )}
                                                                    {prog.mustExtend && !prog.canReassess && (
                                                                        <span className="text-[9px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-1.5 rounded-full font-medium flex items-center gap-0.5">
                                                                            <AlertTriangle className="w-2.5 h-2.5" /> Estender
                                                                        </span>
                                                                    )}
                                                                    {st === 'CRITICAL' && (
                                                                        <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 rounded-full font-medium flex items-center gap-0.5">
                                                                            <AlertTriangle className="w-2.5 h-2.5" /> Crítico
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-base font-bold tabular-nums leading-none ${txtCl}`}>{pct}%</span>
                                                            </div>

                                                            {/* Linha 2: barra de progresso com marcador 85% */}
                                                            <div>
                                                                <div className="relative h-2.5 bg-muted/20 rounded-full overflow-hidden">
                                                                    <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${barCl}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                                                    <div className="absolute inset-y-0 w-0.5 bg-white/25" style={{ left: '85%' }} />
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <span className="text-[9px] text-muted-foreground">
                                                                        <span className="font-medium text-foreground/70">{prog.sessionsCompleted}</span> feitas · <span className="font-medium text-foreground/70">{prog.sessionsExpectedByNow}</span> esperadas
                                                                        {calWeeks > 0 && <span className="text-muted-foreground/55"> ({calWeeks} sem × {spw}x/sem)</span>}
                                                                    </span>
                                                                    {prog.canReassess
                                                                        ? <span className="text-[9px] text-emerald-400 font-medium">85% atingido ✓</span>
                                                                        : faltam > 0
                                                                            ? <span className="text-[9px] text-muted-foreground">faltam {faltam} p/ avançar</span>
                                                                            : <span className="text-[9px] text-muted-foreground">meta 85%</span>
                                                                    }
                                                                </div>
                                                            </div>

                                                            {/* Linha 3: dias da semana atual */}
                                                            <div>
                                                                <p className="text-[9px] text-muted-foreground/60 mb-1 uppercase tracking-wide">Esta semana</p>
                                                                <div className="flex gap-1">
                                                                    {weekDayLabels.map((label, idx) => {
                                                                        const attended  = attendedDays.has(idx)
                                                                        const isToday   = idx === todayDayIdx
                                                                        return (
                                                                            <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                                                                                <div className={`w-full h-4 rounded flex items-center justify-center text-[8px] font-bold transition-all
                                                                                    ${ attended
                                                                                        ? isOk ? 'bg-emerald-500 text-white' : isMid ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                                                                        : isToday ? 'border border-primary/40 text-primary/60 bg-transparent' : 'bg-muted/20 text-muted-foreground/30'
                                                                                    }`}>
                                                                                    {attended ? '✓' : ''}
                                                                                </div>
                                                                                <span className={`text-[8px] ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground/40'}`}>{label}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Linha 4: fase + semana + início */}
                                                            <div className="flex items-center justify-between pt-1.5 border-t border-muted/20">
                                                                <span className="text-[9px] text-muted-foreground">
                                                                    {card.sessionData!.session.periodization?.phaseLabel || prog.currentPhaseLabel} · Sem. {prog.currentWeek}
                                                                </span>
                                                                {firstDate && (
                                                                    <span className="text-[9px] text-muted-foreground/50">desde {firstDate}</span>
                                                                )}
                                                            </div>

                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                            {/* Preparation */}
                                            {card.sessionData.session.preparation && (
                                                <div className="px-3 py-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Preparação</p>
                                                    {(card.sessionData.session.preparation.exercises || []).map((ex: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                                            <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                                                            <span className="text-[10px] font-mono ml-1">{ex.sets}x{ex.reps} {ex.rest}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Blocks */}
                                            {card.sessionData.session.blocks
                                                ? card.sessionData.session.blocks.map((block, bIdx) => (
                                                    <div key={bIdx} className="px-3 py-1.5">
                                                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">{block.code} {block.name}</p>
                                                        {block.exercises.map((ex, eIdx) => (
                                                            <ExerciseRow key={eIdx} ex={ex} savingKey={savingWeightKey}
                                                                onSave={(w) => saveWeight(cardIdx, card.entry.workoutId,
                                                                    (card.sessionData!.progress.currentWeek || 1) - 1,
                                                                    card.sessionData!.session.dayIndex, bIdx, eIdx, w)}
                                                                uniqueKey={`${activeTabId}-${cardIdx}-${bIdx}-${eIdx}`} />
                                                        ))}
                                                    </div>
                                                ))
                                                : <div className="px-3 py-1.5">{(card.sessionData.session.exercises || []).map((ex, i) => (
                                                    <ExerciseRow key={i} ex={ex} savingKey={savingWeightKey}
                                                        onSave={(w) => saveWeight(cardIdx, card.entry.workoutId,
                                                            (card.sessionData!.progress.currentWeek || 1) - 1,
                                                            card.sessionData!.session.dayIndex, ex.blockIdx ?? 0, ex.exerciseIdx ?? i, w)}
                                                        uniqueKey={`${activeTabId}-${cardIdx}-${ex.blockIdx ?? 0}-${ex.exerciseIdx ?? i}`} />
                                                ))}</div>
                                            }
                                            {/* Final Protocol */}
                                            {card.sessionData.session.finalProtocol && (
                                                <div className="px-3 py-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Protocolo Final</p>
                                                    {/* Exercises list (legacy format) */}
                                                    {(card.sessionData.session.finalProtocol.exercises || []).map((ex: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                                            <span className="text-muted-foreground truncate flex-1">{ex.name}</span>
                                                            <span className="text-[10px] font-mono ml-1">{ex.sets}x{ex.reps} {ex.rest}</span>
                                                        </div>
                                                    ))}
                                                    {/* Structure string (new PhaseWorkoutTemplate format) */}
                                                    {card.sessionData.session.finalProtocol.structure && (
                                                        <p className="text-xs text-amber-400 font-medium mt-0.5">
                                                            {card.sessionData.session.finalProtocol.structure}
                                                        </p>
                                                    )}
                                                    {/* Raw string fallback */}
                                                    {!card.sessionData.session.finalProtocol.structure &&
                                                     !(card.sessionData.session.finalProtocol.exercises?.length) &&
                                                     (card.sessionData.session as any).protocoloFinal && (
                                                        <p className="text-xs text-amber-400 font-medium mt-0.5">
                                                            {(card.sessionData.session as any).protocoloFinal}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {/* Raw protocoloFinal string (when finalProtocol object is absent) */}
                                            {!(card.sessionData.session.finalProtocol) && (card.sessionData.session as any).protocoloFinal && (
                                                <div className="px-3 py-1.5">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Protocolo Final</p>
                                                    <p className="text-xs text-amber-400 font-medium">
                                                        {(card.sessionData.session as any).protocoloFinal}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {/* FLOATING BUTTONS */}
                {!isFinalized && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
                        <Button variant="outline" onClick={() => setShowAddStudent(true)}
                            className="rounded-full px-5 h-12 shadow-xl bg-card border-muted hover:border-amber-500/50 gap-2">
                            <UserPlus className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">+ Aluno</span>
                        </Button>
                        <Button onClick={finalizeSession}
                            disabled={finalizingSession || activeCards.every(c => c.loading)}
                            className="rounded-full px-6 h-12 shadow-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white gap-2 text-sm font-bold">
                            {finalizingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                            Finalizar Sessão
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    // ========================================================================
    // RENDER — SELECTION MODE
    // ========================================================================
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Presença</h1>
                    <p className="text-sm text-muted-foreground">Selecione os alunos e inicie a sessão em grupo</p>
                </div>
            </div>

            {/* Active sessions bar */}
            {serverSessions.filter(s => !s.finalized).length > 0 && (() => {
                const stuckSessions = serverSessions.filter(s => !s.finalized && (Date.now() - new Date(s.createdAt).getTime()) > 6 * 60 * 60 * 1000)
                const activeSessions = serverSessions.filter(s => !s.finalized)
                return (
                    <div className="space-y-2">
                        {/* Normal active sessions */}
                        {activeSessions.length > 0 && (
                            <div className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">🟢 Sessões ativas</p>
                                <div className="flex items-center gap-2 overflow-x-auto">
                                    {activeSessions.map(tab => (
                                        <button key={tab.id}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-green-500/15 to-emerald-500/15 text-green-400 border border-green-500/30 whitespace-nowrap flex-shrink-0 hover:from-green-500/25 hover:to-emerald-500/25 transition-all shadow-sm"
                                            onClick={() => { setActiveTabId(tab.id); if (!cardsBySession.has(tab.id)) loadSessionCards(tab) }}>
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            <Users className="w-3.5 h-3.5" />
                                            {tab.label}
                                            <ArrowLeft className="w-3 h-3 rotate-180" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Stuck sessions warning */}
                        {stuckSessions.length > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-amber-400">⚠️ {stuckSessions.length} sessão(ões) travada(s) detectada(s)</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Criadas há mais de 6h — provavelmente por um deploy ou reinicialização do servidor.</p>
                                </div>
                                <button
                                    onClick={clearStuckSessions}
                                    disabled={clearingStuck}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                    {clearingStuck ? 'Limpando...' : 'Limpar Tudo'}
                                </button>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Search + Controls */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Pesquisar aluno por nome ou email..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" autoFocus />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">Selecionar Todos</Button>
                            <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs" disabled={selectedIds.size === 0}>Limpar</Button>
                        </div>
                        {selectedIds.size > 0 && <Badge variant="secondary" className="text-xs">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</Badge>}
                    </div>
                </CardContent>
            </Card>

            {/* Client List */}
            <div className="space-y-1 pb-20">
                {loadingClients ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
                ) : clients.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">{searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno ativo'}</CardContent></Card>
                ) : clients.map((client) => {
                    const isSelected = selectedIds.has(client.id)
                    const inSession = activeClientIdsState.has(client.id)
                    return (
                        <div key={client.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-green-500/50 bg-green-500/5'
                                : inSession ? 'border-yellow-500/30 bg-yellow-500/15 opacity-60'
                                    : 'border-transparent hover:border-muted hover:bg-muted/20'
                                }`}
                            onClick={() => !inSession && toggleSelect(client.id)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-green-500 border-green-500' : inSession ? 'bg-yellow-500/15 border-yellow-500/30' : 'border-muted-foreground/50'
                                }`}>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                {inSession && !isSelected && <CheckCircle className="w-3.5 h-3.5 text-yellow-600" />}
                            </div>
                            <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-amber-500 font-bold text-xs">{initials(client.name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm flex items-center gap-1.5 min-w-0">
                                    <span className="truncate">{client.name}</span>
                                    {mensStatusMap.get(client.id) === 'overdue' && (
                                        <span className="flex-shrink-0 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-bold">INAD</span>
                                    )}
                                    {mensStatusMap.get(client.id) === 'upcoming' && (
                                        <span className="flex-shrink-0 text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-1.5 py-0.5">$ 3d</span>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{client.email || 'Sem email'}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {inSession && <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600">Em sessão</Badge>}
                                {client.level && <Badge variant="outline" className="text-[10px]">{levelLabel(client.level)}</Badge>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Start Session FAB */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button onClick={startGroupSession} disabled={startingSession} size="lg"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl rounded-full px-8 h-14 text-lg gap-2">
                        {startingSession ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                        Iniciar Sessão ({selectedIds.size})
                    </Button>
                </div>
            )}

            {/* ─ Modal: Aviso de pagamento pendente / inadimplência ─ */}
            <Dialog open={!!paymentWarningModal} onOpenChange={() => setPaymentWarningModal(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            Alerta de Mensalidade
                        </DialogTitle>
                        <DialogDescription>
                            Alguns alunos selecionados têm pendências financeiras.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Sem plano configurado */}
                        {paymentWarningModal && paymentWarningModal.no_plan.length > 0 && (
                            <div className="rounded-xl border border-zinc-500/30 bg-zinc-500/5 p-3 space-y-2">
                                <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" />
                                    Sem mensalidade configurada:
                                </p>
                                <ul className="space-y-1">
                                    {paymentWarningModal.no_plan.map(c => (
                                        <li key={c.id} className="text-sm text-zinc-400 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-zinc-500 flex-shrink-0" />
                                            {c.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Em atraso */}
                        {paymentWarningModal && paymentWarningModal.overdue.length > 0 && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                                <p className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4" />
                                    Inadimplente(s) — em atraso:
                                </p>
                                <ul className="space-y-1">
                                    {paymentWarningModal.overdue.map(c => (
                                        <li key={c.id} className="text-sm text-red-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                            {c.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Pendente — não pagou ainda */}
                        {paymentWarningModal && paymentWarningModal.pending.length > 0 && (
                            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
                                <p className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4" />
                                    Pagamento pendente — ainda não pagou:
                                </p>
                                <ul className="space-y-1">
                                    {paymentWarningModal.pending.map(c => (
                                        <li key={c.id} className="text-sm text-orange-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                            {c.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Vencendo em breve */}
                        {paymentWarningModal && paymentWarningModal.upcoming.length > 0 && (
                            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                                <p className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" />
                                    Vencendo em até 3 dias — aviso:
                                </p>
                                <ul className="space-y-1">
                                    {paymentWarningModal.upcoming.map(c => (
                                        <li key={c.id} className="text-sm text-yellow-300 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                                            {c.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPaymentWarningModal(null)} className="w-full sm:w-auto">
                            Cancelar
                        </Button>
                        {paymentWarningModal && (paymentWarningModal.overdue.length > 0 || paymentWarningModal.pending.length > 0 || paymentWarningModal.no_plan.length > 0) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() => {
                                    const blockedIds = new Set([
                                        ...(paymentWarningModal.overdue.map(c => c.id)),
                                        ...(paymentWarningModal.pending.map(c => c.id)),
                                        ...(paymentWarningModal.no_plan.map(c => c.id)),
                                    ])
                                    const allowedIds = Array.from(selectedIds).filter(id => !blockedIds.has(id))
                                    setPaymentWarningModal(null)
                                    if (allowedIds.length > 0) doStartGroupSession(allowedIds)
                                }}
                            >
                                Iniciar sem pendentes
                            </Button>
                        )}
                        <Button size="sm" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={paymentWarningModal?.forceStart}>
                            Liberar mesmo assim
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ============================================================================
// EXERCISE ROW
// ============================================================================
function ExerciseRow({ ex, savingKey, uniqueKey, onSave }: {
    ex: SessionExercise; savingKey: string | null; uniqueKey: string; onSave: (w: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(ex.weight || '')
    const icon = ex.role === 'FOCO_PRINCIPAL' ? '🎯' : ex.role === 'SECUNDARIO' ? '🔄' : '⚡'
    function handleSave() { onSave(val); setEditing(false) }

    return (
        <div className="flex items-center gap-1.5 py-1">
            <span className="text-[10px] w-3">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight break-words" title={ex.name}>{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} · {ex.rest}</p>
            </div>
            {editing ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <input type="text" className="w-14 h-6 text-xs text-center rounded border bg-background px-1" value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                        autoFocus placeholder="kg" />
                    <button className="text-green-500 hover:text-green-400" onClick={handleSave} disabled={savingKey === uniqueKey}>
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
