'use client'

import * as React from 'react'

const AUTH_STORAGE_KEY = 'nimbus.session'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090'

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

type StoredSession = {
  token: string
  user: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
  authFetch: (path: string, init?: RequestInit) => Promise<Response>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function getRecordFileUrl(record: Record<string, unknown>, fieldName: string) {
  const fileName = String(record[fieldName] ?? '')
  if (!fileName) return undefined

  const collection = String(record.collectionId ?? record.collectionName ?? 'users')
  const id = String(record.id ?? '')
  if (!id) return undefined

  return `${API_BASE_URL}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`
}

function normalizeUser(model: Record<string, unknown>): AuthUser {
  const email = String(model.email ?? '')
  const name = String(model.name ?? '').trim() || email.split('@')[0] || 'Usuário'

  return {
    id: String(model.id ?? ''),
    name,
    email,
    avatarUrl: getRecordFileUrl(model, 'avatar'),
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || fallback)
  }
  return fallback
}

export function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<StoredSession | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        setSession(JSON.parse(stored) as StoredSession)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persistSession = React.useCallback((nextSession: StoredSession) => {
    setSession(nextSession)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
  }, [])

  const login = React.useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível entrar.'))
      }

      persistSession({
        token: String(payload.token),
        user: normalizeUser(payload.record ?? payload.model ?? {}),
      })
    },
    [persistSession],
  )

  const signup = React.useCallback(
    async (name: string, email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/collections/users/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          passwordConfirm: password,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Não foi possível criar sua conta.'))
      }

      await login(email, password)
    },
    [login],
  )

  const logout = React.useCallback(() => {
    setSession(null)
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const updateUser = React.useCallback((user: Partial<AuthUser>) => {
    setSession((current) => {
      if (!current) return current

      const nextSession = {
        ...current,
        user: {
          ...current.user,
          ...user,
        },
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      return nextSession
    })
  }, [])

  const authFetch = React.useCallback(
    (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      if (session?.token) {
        headers.set('Authorization', `Bearer ${session.token}`)
      }

      return fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
      })
    },
    [session?.token],
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.token),
      login,
      signup,
      logout,
      updateUser,
      authFetch,
    }),
    [authFetch, isLoading, login, logout, session, signup, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
