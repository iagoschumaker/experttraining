// ============================================================================
// EXPERT PRO TRAINING — FETCH COM AUTO-REFRESH E REDIRECT
// ============================================================================
// Wrapper de fetch que:
// 1. Tenta a requisição normalmente
// 2. Se receber 401, tenta refresh do token via /api/auth/refresh
// 3. Se refresh funcionar, repete a requisição original
// 4. Se refresh falhar, redireciona para /login
// ============================================================================

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Tenta renovar o access token usando o refresh token
 */
async function tryRefreshToken(): Promise<boolean> {
  // Se já está refreshing, espera o resultado
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        console.log('🔄 Token renovado com sucesso')
        return true
      }
      console.log('❌ Refresh falhou:', res.status)
      return false
    } catch {
      console.log('❌ Refresh falhou: erro de rede')
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Redireciona para a página de login
 */
function redirectToLogin() {
  // Evita redirect em loop
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    console.log('🔒 Sessão expirada, redirecionando para login...')
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
  }
}

/**
 * Fetch com auto-refresh de token e redirect para login em caso de sessão expirada.
 *
 * Uso: substituir `fetch(url, opts)` por `fetchWithAuth(url, opts)`
 *
 * - Se a resposta for 401, tenta renovar o token automaticamente
 * - Se o refresh funcionar, repete a requisição original
 * - Se o refresh falhar, redireciona para /login
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init)

  // Se não for 401, retorna normalmente
  if (res.status !== 401) {
    return res
  }

  // 401 — tentar refresh
  const refreshed = await tryRefreshToken()

  if (refreshed) {
    // Refresh funcionou — repetir a requisição original
    return fetch(input, init)
  }

  // Refresh falhou — sessão expirada, redirecionar para login
  redirectToLogin()

  // Retorna a resposta original (o redirect já foi disparado)
  return res
}
