import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AUTH_STORAGE_KEY } from '@/lib/api'
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  type AuthUser,
  type LoginPayload,
} from '@/features/auth/authApi'

type UserState = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (payload: { token: string; user: AuthUser }) => void
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ token, user }) => {
        set({
          token,
          user,
          isAuthenticated: Boolean(token),
        })
      },

      login: async (payload) => {
        const session = await loginRequest(payload)
        get().setAuth({ token: session.token, user: session.user })

        const me = await fetchCurrentUser()
        if (me) {
          const merged = {
            ...session.user,
            ...me,
            national_id: me.national_id ?? session.user.national_id ?? payload.national_id,
            nationalId: me.nationalId ?? session.user.nationalId ?? payload.national_id,
          }
          get().setAuth({ token: session.token, user: merged })
          return merged
        }

        return session.user
      },

      refreshUser: async () => {
        const token = get().token
        if (!token) return null

        const me = await fetchCurrentUser()
        if (!me) return get().user

        const merged = { ...get().user, ...me }
        get().setAuth({ token, user: merged })
        return merged
      },

      logout: async () => {
        if (get().token) {
          await logoutRequest()
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: Boolean(state.token),
      }),
    },
  ),
)

export function useAuth() {
  const token = useUserStore((state) => state.token)
  const user = useUserStore((state) => state.user)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const setAuth = useUserStore((state) => state.setAuth)
  const login = useUserStore((state) => state.login)
  const logout = useUserStore((state) => state.logout)
  const refreshUser = useUserStore((state) => state.refreshUser)

  const nationalId = user?.nationalId ?? user?.national_id ?? ''

  return {
    token,
    user,
    session: user
      ? {
          nationalId,
          name: user.name,
          phone: user.phone,
          code: user.code,
          grade: user.grade,
          image: user.image,
        }
      : null,
    isAuthenticated,
    setAuth,
    login,
    logout,
    refreshUser,
  }
}
