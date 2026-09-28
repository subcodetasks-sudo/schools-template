import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import i18n from '@/lib/i18n'
import { revokeFcmToken } from '@/lib/firebase'
import { AUTH_STORAGE_KEY, registerAuthBridge } from '@/lib/api'
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  type AuthUser,
  type LoginPayload,
} from '@/features/auth/authApi'

/** Why a session ended without the user logging out. Maps to `auth.<reason>` messages. */
export type SessionEndReason = 'sessionExpired'

type UserState = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  /** How this tab's last session ended; not persisted. */
  signOutReason: 'logout' | SessionEndReason | null
  setAuth: (payload: { token: string; user: AuthUser }) => void
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => void
  /**
   * Ends the session because the server rejected it (revoked token, deleted account…).
   * When `token` is given, only that session is ended, so stale responses from an
   * older session can't sign out a newer one.
   */
  endSession: (reason: SessionEndReason, token?: string) => void
  refreshUser: () => Promise<AuthUser | null>
}

const signedOut = {
  token: null,
  user: null,
  isAuthenticated: false,
} as const

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...signedOut,
      signOutReason: null,

      setAuth: ({ token, user }) => {
        set({
          token,
          user,
          isAuthenticated: Boolean(token),
          signOutReason: null,
        })
      },

      login: async (payload) => {
        const session = await loginRequest(payload)

        // Load the full profile before committing the session, so route guards
        // redirect once, with a complete user.
        const me = await fetchCurrentUser(session.token)
        const user = me
          ? {
              ...session.user,
              ...me,
              national_id: me.national_id ?? session.user.national_id,
              nationalId: me.nationalId ?? session.user.nationalId,
              code: me.code ?? session.user.code ?? payload.code,
            }
          : session.user

        get().setAuth({ token: session.token, user })
        return user
      },

      refreshUser: async () => {
        const token = get().token
        if (!token) return null

        const me = await fetchCurrentUser()
        // The session changed while the request was in flight.
        if (!me || get().token !== token) return get().user

        const merged = { ...get().user, ...me }
        get().setAuth({ token, user: merged })
        return merged
      },

      logout: () => {
        const { token } = get()
        // Clear locally first so the UI never waits on (or is blocked by) the network.
        set({ ...signedOut, signOutReason: 'logout' })
        if (!token) return
        void logoutRequest(token)
        // Only the tab that signs out revokes the (browser-wide) push token; other tabs
        // just follow via the storage event, so they can't revoke a newer registration.
        void revokeFcmToken()
      },

      endSession: (reason, token) => {
        const current = get().token
        if (!current || (token && token !== current)) return

        set({ ...signedOut, signOutReason: reason })
        void revokeFcmToken()
        toast.error(i18n.t(`auth.${reason}`), { id: 'session-ended' })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: Boolean(state.token),
      }),
      // Never trust the stored flag: derive auth from the token, and ignore corrupt data.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<UserState>
        const token = typeof stored.token === 'string' && stored.token ? stored.token : null
        return {
          ...current,
          token,
          user: token ? (stored.user ?? null) : null,
          isAuthenticated: Boolean(token),
        }
      },
    },
  ),
)

registerAuthBridge({
  getToken: () => useUserStore.getState().token,
  onUnauthorized: (token) => useUserStore.getState().endSession('sessionExpired', token),
})

// Keep tabs in sync: logging in/out (or a session ending) in one tab applies to all.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // `key === null` means another tab cleared all storage.
    if (event.key !== null && event.key !== AUTH_STORAGE_KEY) return
    if (event.storageArea && event.storageArea !== window.localStorage) return

    if (!event.newValue) {
      useUserStore.setState(signedOut)
      return
    }
    // `persist` is missing when storage is unavailable.
    void useUserStore.persist?.rehydrate()
  })
}

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
