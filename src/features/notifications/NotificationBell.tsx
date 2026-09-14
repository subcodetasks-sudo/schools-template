import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/userStore'
import { NotificationItem } from '@/features/notifications/NotificationItem'
import { useNotifications } from '@/features/notifications/NotificationsProvider'
import {
  deleteNotification,
  getNotificationPath,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type StudentNotification,
} from '@/features/notifications/notificationsApi'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { unreadCount, revision, refreshUnread, setUnreadCount } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<StudentNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || !isAuthenticated) return

    let cancelled = false
    setError(null)

    getNotifications({ page: 1, per_page: 10 })
      .then((page) => {
        if (!cancelled) setItems(page.items)
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([])
          setError(getErrorMessage(err, t('notifications.loadError')))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, open, revision, t])

  if (!isAuthenticated) return null

  const closeMenu = () => setOpen(false)

  const goToAll = () => {
    closeMenu()
    navigate('/profile/notifications')
  }

  const handleOpen = async (notification: StudentNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id)
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      } catch {
        // Opening still continues even if the read flag fails.
      }
    }

    closeMenu()
    navigate(getNotificationPath(notification.type) || '/profile/notifications')
  }

  const handleDelete = async (notification: StudentNotification) => {
    try {
      await deleteNotification(notification.id)
      setItems((current) => current.filter((item) => item.id !== notification.id))
      if (!notification.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch {
      setError(t('notifications.deleteError'))
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
      await refreshUnread()
    } catch {
      setError(t('notifications.markAllError'))
    }
  }

  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        size="icon"
        onClick={() => {
          if (!open) {
            setIsLoading(true)
            setError(null)
          }
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('notifications.title')}
        className="relative size-11 cursor-pointer rounded-xl border-0 bg-brand-primary text-white shadow-sm ring-0 transition-all hover:bg-brand-secondary active:scale-95"
      >
        <Bell className="size-5" aria-hidden />
        {badge ? (
          <span className="absolute -end-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-secondary px-1 text-[10px] font-bold leading-5 text-white">
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-[0_12px_40px_rgba(31,83,111,0.12)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-brand-dark/8 px-4 py-3">
            <p className="text-sm font-bold text-brand-dark">{t('notifications.title')}</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-3 py-8 text-center text-sm text-brand-dark/55">
                {t('state.loading')}
              </p>
            ) : error ? (
              <p className="px-3 py-8 text-center text-sm text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-brand-dark/55">
                {t('notifications.empty')}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    compact
                    onOpen={() => void handleOpen(notification)}
                    onDelete={() => void handleDelete(notification)}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={goToAll}
            className={cn(
              'block w-full border-t border-brand-dark/8 px-4 py-3 text-center text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary/8',
            )}
          >
            {t('notifications.viewAll')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
