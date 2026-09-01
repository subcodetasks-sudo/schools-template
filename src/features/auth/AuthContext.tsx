import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const AUTH_STORAGE_KEY = 'school-auth-session'

export type AuthSession = {
  nationalId: string
}

type AuthContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (session: AuthSession) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    return parsed.nationalId ? parsed : null
  } catch {
    return null
  }
}

export function formatStudentAccountId(nationalId: string) {
  return `${nationalId}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  const login = useCallback((nextSession: AuthSession) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session !== null,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
