import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BellOff } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { NotificationItem } from '@/features/notifications/NotificationItem'
import { useNotifications } from '@/features/notifications/NotificationsProvider'
import {
  deleteNotification,
  getNotificationPath,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationsMeta,
  type StudentNotification,
} from '@/features/notifications/notificationsApi'
import { getErrorMessage } from '@/lib/api'

const PAGE_SIZE = 10

export function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { unreadCount, revision, refreshUnread, setUnreadCount } =
    useNotifications()
  const [items, setItems] = useState<StudentNotification[]>([])
  const [meta, setMeta] = useState<NotificationsMeta>({
    total: 0,
    per_page: PAGE_SIZE,
    current_page: 1,
    last_page: 1,
  })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPage: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getNotifications({ page: nextPage, per_page: PAGE_SIZE })
      setItems(result.items)
      setMeta(result.meta)
    } catch (err) {
      setItems([])
      setError(getErrorMessage(err, t('notifications.loadError')))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load(page)
  }, [load, page, revision])

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
        // Navigation still happens if marking read fails.
      }
    }

    const path = getNotificationPath(notification.type)
    if (path) navigate(path)
  }

  const handleDelete = async (notification: StudentNotification) => {
    try {
      await deleteNotification(notification.id)
      const remaining = items.filter((item) => item.id !== notification.id)
      if (!notification.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
      if (remaining.length === 0 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await load(page)
      }
      await refreshUnread()
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

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('notifications.title')}
          <svg
            className="absolute -bottom-0.5 inset-s-0 h-2.5 w-24 text-brand-secondary"
            viewBox="0 0 120 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 8C20 2 40 10 58 6C76 2 96 10 118 4"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </h1>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm font-semibold text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary/8"
          >
            {t('notifications.markAllRead')}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-brand-dark/55">{t('profile.loading')}</p>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void load(page)}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
          >
            {t('profile.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
            <BellOff className="size-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-brand-dark">{t('notifications.empty')}</p>
          <p className="max-w-sm text-sm text-brand-dark/55">
            {t('notifications.emptyDescription')}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-2">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={() => void handleOpen(notification)}
                onDelete={() => void handleDelete(notification)}
              />
            ))}
          </div>

          <Pagination
            className="mt-10"
            page={meta.current_page}
            pageCount={Math.max(1, meta.last_page)}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
