import { useTranslation } from 'react-i18next'
import {
  Bell,
  CalendarCheck2,
  MessageCircle,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  formatNotificationDate,
  formatNotificationRelative,
  type StudentNotification,
} from '@/features/notifications/notificationsApi'
import { cn } from '@/lib/utils'

const typeIcons = {
  attendance: CalendarCheck2,
  student_profile: UserRound,
  chat_message: MessageCircle,
} as const

type NotificationItemProps = {
  notification: StudentNotification
  compact?: boolean
  onOpen?: () => void
  onDelete?: () => void
}

export function NotificationItem({
  notification,
  compact = false,
  onOpen,
  onDelete,
}: NotificationItemProps) {
  const { t, i18n } = useTranslation()
  const Icon =
    typeIcons[notification.type as keyof typeof typeIcons] ?? Bell
  const typeLabel = t(`notifications.types.${notification.type}`, {
    defaultValue: t('notifications.types.generic'),
  })
  const time = compact
    ? formatNotificationRelative(notification.createdAt, i18n.language)
    : formatNotificationDate(notification.createdAt, i18n.language)

  return (
    <article
      className={cn(
        'group relative flex gap-3 rounded-xl border px-3 py-3 text-start transition-colors',
        notification.isRead
          ? 'border-transparent bg-transparent hover:bg-brand-primary/5'
          : 'border-brand-primary/15 bg-brand-primary/8 hover:bg-brand-primary/12',
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
          notification.isRead
            ? 'bg-brand-dark/6 text-brand-dark/70'
            : 'bg-brand-primary text-white',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-start"
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
          {typeLabel}
          {!notification.isRead ? (
            <span className="size-1.5 rounded-full bg-brand-secondary" aria-hidden />
          ) : null}
        </p>
        <h3
          className={cn(
            'mt-0.5 text-sm text-brand-dark',
            notification.isRead ? 'font-medium' : 'font-bold',
          )}
        >
          {notification.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-brand-dark/65">
          {notification.body}
        </p>
        <p className="mt-1.5 text-[11px] text-brand-dark/45">{time}</p>
      </button>

      {onDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          aria-label={t('notifications.delete')}
          className={cn(
            'absolute end-2 top-2 inline-flex size-8 items-center justify-center rounded-lg text-brand-dark/40 transition-colors hover:bg-destructive/10 hover:text-destructive',
            compact && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </article>
  )
}
