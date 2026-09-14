import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/userStore'
import {
  getUnreadCount,
  registerDeviceToken,
} from '@/features/notifications/notificationsApi'
import { getFcmToken, getFirebaseMessaging, onMessage } from '@/lib/firebase'

type NotificationsContextValue = {
  unreadCount: number
  revision: number
  refreshUnread: () => Promise<void>
  setUnreadCount: (count: number) => void
  bumpRevision: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [revision, setRevision] = useState(0)
  const registeredFor = useRef<string | null>(null)

  const bumpRevision = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }

    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch {
      // Keep the last known count if the badge request fails.
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      registeredFor.current = null
      return
    }

    void refreshUnread()
  }, [isAuthenticated, refreshUnread])

  useEffect(() => {
    if (!isAuthenticated) return

    const onFocus = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [isAuthenticated, refreshUnread])

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false

    const registerPush = async () => {
      try {
        const token = await getFcmToken()
        if (!token || cancelled) return
        if (registeredFor.current === token) return
        await registerDeviceToken(token)
        registeredFor.current = token
      } catch (error) {
        console.warn('Could not register push notifications', error)
      }
    }

    void registerPush()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const listen = async () => {
      const messaging = await getFirebaseMessaging()
      if (!messaging || cancelled) return

      unsubscribe = onMessage(messaging, (payload) => {
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          t('notifications.new')
        const body = payload.notification?.body || payload.data?.body

        toast(title, { description: body })
        setUnreadCount((count) => count + 1)
        bumpRevision()
        void refreshUnread()
      })
    }

    void listen()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [bumpRevision, isAuthenticated, refreshUnread, t])

  const value = useMemo(
    () => ({
      unreadCount: isAuthenticated ? unreadCount : 0,
      revision,
      refreshUnread,
      setUnreadCount,
      bumpRevision,
    }),
    [bumpRevision, isAuthenticated, refreshUnread, revision, unreadCount],
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return context
}
