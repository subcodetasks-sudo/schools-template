import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BellOff,
  Check,
  CircleAlert,
  Clock,
  Copy,
  ExternalLink,
  LoaderCircle,
  Send,
  Share2,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { GroupsPageTitle } from '@/features/groups/components/GroupsShared'
import { secondsUntilExpiry, type TelegramFollower, type TelegramLink } from '@/features/profile/telegramApi'
import { useTelegramFollowUp } from '@/features/profile/useTelegramFollowUp'
import { cn } from '@/lib/utils'

function localeFor(language: string) {
  return language.startsWith('ar') ? 'ar-EG' : 'en-US'
}

function formatLinkedDate(value: string | null, language: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium' }).format(date)
}

function formatCountdown(totalSeconds: number, language: string) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const format = new Intl.NumberFormat(localeFor(language), { minimumIntegerDigits: 2 })
  return `${format.format(minutes)}:${format.format(seconds)}`
}

/**
 * Opens a blank tab *inside the click handler*, so popup blockers allow it; the
 * caller points it at Telegram once the link exists (or closes it on failure).
 * Returns `null` when the browser still refused: the link panel is the fallback.
 */
function openPendingTab(): Window | null {
  const tab = window.open('', '_blank')
  if (!tab) return null
  try {
    // Never hand the new tab a handle back to this page.
    tab.opener = null
  } catch {
    // Nothing to detach.
  }
  return tab
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 className="text-base font-bold text-brand-dark">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Countdown({ link, language }: { link: TelegramLink; language: string }) {
  const [seconds, setSeconds] = useState(() => secondsUntilExpiry(link))

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntilExpiry(link)), 1000)
    return () => window.clearInterval(timer)
  }, [link])

  return (
    <time dir="ltr" className="font-semibold tabular-nums">
      {formatCountdown(seconds, language)}
    </time>
  )
}

function LinkPanel({ link, botUsername }: { link: TelegramLink; botUsername: string | null }) {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  // Fixed when the link appears (the panel is keyed by URL), so the warning matches the real TTL.
  const [ttlMinutes] = useState(() => Math.max(1, Math.round(secondsUntilExpiry(link) / 60)))
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable / denied: leave the text selected for a manual copy.
      inputRef.current?.focus()
      inputRef.current?.select()
      toast.error(t('profile.telegram.copyFailed'))
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: t('profile.telegram.shareTitle'), url: link.url })
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError: not an error.
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error(t('profile.telegram.shareFailed'))
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-brand-primary/25 bg-brand-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-brand-dark">{t('profile.telegram.linkReadyTitle')}</h3>
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-dark/60">
          <Clock className="size-3.5" aria-hidden />
          {t('profile.telegram.expiresIn')} <Countdown link={link} language={i18n.language} />
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-brand-dark/70">
        {/* LRI…PDI keeps "@bot" from being reordered inside right-to-left text. */}
        {t('profile.telegram.linkReadyHint', {
          bot: botUsername ? `⁦@${botUsername}⁩` : 'Telegram',
        })}
      </p>

      <input
        ref={inputRef}
        readOnly
        value={link.url}
        dir="ltr"
        aria-label={t('profile.telegram.linkFieldLabel')}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-3 h-10 w-full rounded-xl border border-brand-dark/15 bg-white px-3 text-xs text-brand-dark/80 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-medium text-white transition-colors hover:bg-brand-dark focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ExternalLink className="size-4" aria-hidden />
          {t('profile.telegram.openTelegram')}
        </a>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copy()}
          className="h-11 gap-2 rounded-xl border-brand-dark/15 px-5"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t('profile.telegram.copied') : t('profile.telegram.copyLink')}
        </Button>
        {canShare ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void share()}
            className="h-11 gap-2 rounded-xl border-brand-dark/15 px-5"
          >
            <Share2 className="size-4" aria-hidden />
            {t('profile.telegram.shareLink')}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-brand-dark/60">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <p>{t('profile.telegram.shareWarning', { minutes: ttlMinutes })}</p>
      </div>

      <p role="status" className="mt-3 flex items-center gap-2 text-xs text-brand-dark/55">
        <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        {t('profile.telegram.waiting')}
      </p>
    </div>
  )
}

function FollowerRow({
  follower,
  isRemoving,
  onRemove,
}: {
  follower: TelegramFollower
  isRemoving: boolean
  onRemove: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const stopRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)
  const name = follower.name ?? t('profile.telegram.parentFallback')
  const linkedOn = formatLinkedDate(follower.linkedAt, i18n.language)

  // Swapping buttons unmounts the focused one; hand focus to its replacement.
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus()
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false
      stopRef.current?.focus()
    }
  }, [confirming])

  const cancelConfirm = () => {
    restoreFocusRef.current = true
    setConfirming(false)
  }

  return (
    <li
      onKeyDown={(event) => {
        if (event.key === 'Escape' && confirming && !isRemoving) cancelConfirm()
      }}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-dark/10 px-4 py-3',
        follower.isActive ? 'bg-white' : 'bg-muted/40',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center rounded-full',
            follower.isActive
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-brand-dark/5 text-brand-dark/40',
          )}
        >
          {follower.isActive ? (
            <UserRound className="size-5" aria-hidden />
          ) : (
            <BellOff className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p
            dir="auto"
            className={cn(
              'text-sm font-semibold wrap-anywhere',
              follower.isActive ? 'text-brand-dark' : 'text-brand-dark/55',
            )}
          >
            {name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-brand-dark/50">
            {linkedOn ? (
              <span>
                {t('profile.telegram.linkedOn')}{' '}
                <time dateTime={follower.linkedAt ?? undefined}>{linkedOn}</time>
              </span>
            ) : null}
            {!follower.isActive ? (
              <span className="font-medium text-amber-700">{t('profile.telegram.inactive')}</span>
            ) : null}
          </p>
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-dark/60">{t('profile.telegram.stopConfirm')}</span>
          <Button
            ref={confirmRef}
            type="button"
            variant="destructive"
            size="sm"
            disabled={isRemoving}
            onClick={() => onRemove(follower.id)}
            className="h-9 gap-1.5 rounded-lg px-3"
          >
            {isRemoving ? (
              <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : null}
            {isRemoving ? t('profile.telegram.stopping') : t('profile.telegram.stopYes')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRemoving}
            onClick={cancelConfirm}
            className="h-9 rounded-lg border-brand-dark/15 px-3"
          >
            {t('profile.telegram.stopCancel')}
          </Button>
        </div>
      ) : (
        <Button
          ref={stopRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          aria-label={t('profile.telegram.stopFor', { name })}
          className="h-9 rounded-lg border-brand-dark/15 px-3 text-destructive hover:text-destructive"
        >
          {t('profile.telegram.stop')}
        </Button>
      )}
    </li>
  )
}

export function TelegramFollowUpPage() {
  const { t } = useTranslation()
  const {
    followers,
    botUsername,
    isLoading,
    failure,
    isAvailable,
    link,
    linkExpired,
    isCreating,
    removingIds,
    reload,
    createLink,
    dismissLink,
    removeFollower,
  } = useTelegramFollowUp()

  // The status was never loaded: nothing to build the screen from.
  const handleCreate = async () => {
    const tab = openPendingTab()
    const created = await createLink()
    if (!tab) return
    if (created && !tab.closed) tab.location.replace(created.url)
    else tab.close()
  }

  const failureFallbacks = {
    forbidden: t('profile.telegram.forbidden'),
    notFound: t('profile.telegram.studentNotFound'),
    generic: t('profile.telegram.loadError'),
    unavailable: '',
  } as const
  const failureMessage =
    failure === null ? null : failure.message || failureFallbacks[failure.kind]

  let body: ReactNode
  if (isLoading) {
    body = (
      <div role="status" className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55">
        {t('profile.loading')}
      </div>
    )
  } else if (failure?.kind === 'unavailable' || (failure === null && !isAvailable)) {
    body = <UnavailableState onRetry={failure ? reload : undefined} />
  } else if (failure) {
    body = (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p role="alert" className="text-sm text-destructive">
          {failureMessage}
        </p>
        {failure.kind === 'generic' ? (
          <button
            type="button"
            onClick={reload}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
          >
            {t('profile.retry')}
          </button>
        ) : null}
      </div>
    )
  } else {
    body = (
      <div className="space-y-5">
        <Panel icon={Send} title={t('profile.telegram.connectTitle')}>
          <p className="text-sm leading-relaxed text-brand-dark/70">{t('profile.telegram.connectHint')}</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              disabled={isCreating}
              onClick={() => void handleCreate()}
              className="h-11 gap-2 rounded-xl bg-brand-primary px-6 text-white hover:bg-brand-dark"
            >
              {isCreating ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Send className="size-4 rtl:-scale-x-100" aria-hidden />
              )}
              {isCreating
                ? t('profile.telegram.creating')
                : link
                  ? t('profile.telegram.newLink')
                  : t('profile.telegram.connect')}
            </Button>
            {link ? (
              <Button
                type="button"
                variant="ghost"
                onClick={dismissLink}
                className="h-11 rounded-xl px-4 text-brand-dark/60"
              >
                {t('profile.telegram.hideLink')}
              </Button>
            ) : null}
          </div>

          {/* Always mounted so screen readers announce the text when it appears. */}
          <div role="status">
            {linkExpired && !link ? (
              <p className="mt-4 flex items-start gap-2 text-sm text-amber-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t('profile.telegram.linkExpired')}
              </p>
            ) : null}
          </div>

          {link ? (
            // Keyed by URL so a new link starts with fresh copy / countdown state.
            <LinkPanel key={link.url} link={link} botUsername={botUsername} />
          ) : null}
        </Panel>

        <Panel icon={UserRound} title={t('profile.telegram.followersTitle')}>
          {followers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-dark/15 bg-muted/20 px-4 py-8 text-center text-sm text-brand-dark/50">
              {t('profile.telegram.noFollowers')}
            </p>
          ) : (
            <ul className="space-y-3">
              {followers.map((follower) => (
                <FollowerRow
                  key={follower.id}
                  follower={follower}
                  isRemoving={removingIds.has(follower.id)}
                  onRemove={(id) => void removeFollower(id)}
                />
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs leading-relaxed text-brand-dark/50">
            {t('profile.telegram.stopFromTelegram')}
          </p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="w-full">
      <GroupsPageTitle>{t('profile.nav.telegram')}</GroupsPageTitle>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/55">
        {t('profile.telegram.subtitle')}
      </p>
      <div className="mt-8">{body}</div>
    </div>
  )
}

function UnavailableState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-16 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <Send className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-brand-dark">{t('profile.telegram.unavailableTitle')}</p>
      <p className="mt-1 text-sm text-brand-dark/50">{t('profile.telegram.unavailableHint')}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      ) : null}
    </div>
  )
}
