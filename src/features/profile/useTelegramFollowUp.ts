import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import {
  createTelegramLink,
  getTelegramFollowUp,
  hasNewActiveFollower,
  removeTelegramFollower,
  type TelegramFollowUpStatus,
  type TelegramFollower,
  type TelegramLink,
} from '@/features/profile/telegramApi'

/** Re-check cadence while a link is waiting for the parent to press Start. */
const FAST_POLL_MS = 4_000
const FAST_POLL_WINDOW_MS = 60_000
const SLOW_POLL_MS = 15_000
/** `setTimeout` overflows (and fires immediately) above this. */
const MAX_TIMER_MS = 2_147_483_647
/** The client's own wording for failures that carry no server message. */
const GENERIC_HTTP_MESSAGE = /^Request failed with status code \d+$/i

export type TelegramLoadFailure = 'forbidden' | 'unavailable' | 'notFound' | 'generic'

function failureKind(err: unknown): TelegramLoadFailure {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'forbidden'
    if (err.status === 503) return 'unavailable'
    // The account has no student record yet: nothing a retry could fix.
    if (err.status === 404) return 'notFound'
  }
  return 'generic'
}

function isAbort(err: unknown) {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'CanceledError')
  )
}

/**
 * The API's own (already localized) message when it sent one; otherwise
 * `fallback`, so network and bare HTTP failures never leak English client text.
 */
function serverMessage(err: unknown, fallback: string) {
  if (
    err instanceof ApiError &&
    err.status !== 401 &&
    err.message &&
    !GENERIC_HTTP_MESSAGE.test(err.message)
  ) {
    return err.message
  }
  return fallback
}

/**
 * Owns everything the "follow on Telegram" screen needs: the follower list, the
 * one-time link (kept in memory only — it is a credential), and the refresh
 * logic for the parent finishing in the Telegram app.
 */
export function useTelegramFollowUp() {
  const { t } = useTranslation()
  // `t` changes identity with the language; keep callbacks stable and still current.
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  const [status, setStatus] = useState<TelegramFollowUpStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [failure, setFailure] = useState<{ kind: TelegramLoadFailure; message: string } | null>(null)
  const [link, setLink] = useState<TelegramLink | null>(null)
  const [linkExpired, setLinkExpired] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(() => new Set())
  /** Set when a request answers 503 although the status said the feature was on. */
  const [forcedUnavailable, setForcedUnavailable] = useState(false)

  const statusRef = useRef<TelegramFollowUpStatus | null>(null)
  const linkRef = useRef<TelegramLink | null>(null)
  const creatingRef = useRef(false)
  const removingRef = useRef(new Set<string>())
  const refreshInFlightRef = useRef(false)
  const linkCreatedAtRef = useRef(0)
  const lastPollAtRef = useRef(0)
  /** Request ordering: a response older than one already applied is dropped. */
  const startedSeqRef = useRef(0)
  const appliedSeqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const commitLink = useCallback((next: TelegramLink | null) => {
    linkRef.current = next
    setLink(next)
  }, [])

  const commitStatus = useCallback((next: TelegramFollowUpStatus | null) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  /** Applies a server status unless a newer response was already applied. */
  const applyStatus = useCallback(
    (next: TelegramFollowUpStatus, seq: number) => {
      if (seq < appliedSeqRef.current) return
      appliedSeqRef.current = seq

      const previous = statusRef.current
      // The parent pressed Start: the link is spent (it works once), so retire it.
      if (linkRef.current && previous && hasNewActiveFollower(previous.followers, next.followers)) {
        commitLink(null)
        toast.success(tRef.current('profile.telegram.linkedSuccess'))
      }
      if (!next.configured) commitLink(null)

      // A good response supersedes any earlier load error (e.g. back online).
      setFailure(null)
      setForcedUnavailable(false)
      commitStatus(next)
    },
    [commitLink, commitStatus],
  )

  /**
   * Requests the status and applies it. A `silent` fetch (foreground / polling)
   * never touches the loading flag and never replaces good data with an error.
   */
  const fetchStatus = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (silent && refreshInFlightRef.current) return
      const signal = abortRef.current?.signal
      const seq = ++startedSeqRef.current
      refreshInFlightRef.current = true

      try {
        const next = await getTelegramFollowUp(signal)
        if (signal?.aborted) return
        if (next) {
          applyStatus(next, seq)
        } else if (!silent || statusRef.current === null) {
          setFailure({ kind: 'generic', message: '' })
        }
      } catch (err) {
        if (signal?.aborted || isAbort(err)) return
        const kind = failureKind(err)
        if (!silent || statusRef.current === null) {
          setFailure({ kind, message: serverMessage(err, '') })
        } else if (kind === 'unavailable') {
          setForcedUnavailable(true)
        }
      } finally {
        refreshInFlightRef.current = false
        if (!signal?.aborted && !silent) setIsLoading(false)
      }
    },
    [applyStatus],
  )

  /** Silent refreshes keep the screen as is; a visible one (retry) shows the loading state. */
  const refresh = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!silent) {
        setIsLoading(true)
        setFailure(null)
      }
      await fetchStatus({ silent })
    },
    [fetchStatus],
  )

  // Initial load (the state already starts as loading); also cancels everything
  // in flight on unmount.
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    void fetchStatus({ silent: false })
    return () => {
      controller.abort()
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [fetchStatus])

  /**
   * The link's time is up. Check once more first: the parent may have used it
   * moments (or minutes, if polling was throttled) ago, which is not an expiry.
   */
  const expireLink = useCallback(async () => {
    const expiring = linkRef.current
    if (!expiring) return
    await refresh({ silent: true })
    // Retired by the refresh (linked), replaced, or dismissed meanwhile.
    if (linkRef.current !== expiring) return
    commitLink(null)
    setLinkExpired(true)
  }, [commitLink, refresh])

  // Expire the link on time (timers are throttled in background tabs; see below).
  const expiresAtMs = link?.expiresAtMs ?? null
  useEffect(() => {
    if (expiresAtMs === null) return
    const delay = Math.min(Math.max(0, expiresAtMs - Date.now()), MAX_TIMER_MS)
    const timer = window.setTimeout(() => {
      // A clamped delay fires early: only expire what has really run out.
      if (expiresAtMs <= Date.now()) void expireLink()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [expiresAtMs, expireLink])

  // The parent finishes in the Telegram app, so refresh when this tab is shown again.
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'hidden') return
      const current = linkRef.current
      if (current && current.expiresAtMs <= Date.now()) {
        void expireLink()
      } else if (removingRef.current.size === 0) {
        void refresh({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [expireLink, refresh])

  // While a link is live: every few seconds for the first minute, then less often,
  // until it expires. Paused while hidden or while a change is being saved.
  const hasLink = link !== null
  const isBusy = removingIds.size > 0 || isCreating
  useEffect(() => {
    if (!hasLink || isBusy) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      const inFastWindow = now - linkCreatedAtRef.current <= FAST_POLL_WINDOW_MS
      if (!inFastWindow && now - lastPollAtRef.current < SLOW_POLL_MS) return
      lastPollAtRef.current = now
      void refresh({ silent: true })
    }, FAST_POLL_MS)
    return () => window.clearInterval(timer)
  }, [hasLink, isBusy, refresh])

  /** Creates a fresh link. Resolves with it, or `null` when it could not be created. */
  const createLink = useCallback(async (): Promise<TelegramLink | null> => {
    if (creatingRef.current) return null
    creatingRef.current = true
    setIsCreating(true)
    setLinkExpired(false)

    try {
      const created = await createTelegramLink(abortRef.current?.signal)
      if (!created) {
        toast.error(tRef.current('profile.telegram.linkInvalid'))
        return null
      }
      linkCreatedAtRef.current = Date.now()
      lastPollAtRef.current = 0
      commitLink(created)
      return created
    } catch (err) {
      if (isAbort(err)) return null
      if (failureKind(err) === 'unavailable') {
        commitLink(null)
        setForcedUnavailable(true)
      }
      const fallback =
        err instanceof ApiError && err.status === 429
          ? tRef.current('profile.telegram.rateLimited')
          : tRef.current('profile.telegram.linkError')
      toast.error(serverMessage(err, fallback))
      return null
    } finally {
      creatingRef.current = false
      setIsCreating(false)
    }
  }, [commitLink])

  const dismissLink = useCallback(() => {
    commitLink(null)
    setLinkExpired(false)
  }, [commitLink])

  const removeFollower = useCallback(
    async (id: string) => {
      if (removingRef.current.has(id)) return
      removingRef.current.add(id)
      setRemovingIds(new Set(removingRef.current))

      try {
        const next = await removeTelegramFollower(id, abortRef.current?.signal)
        if (next) {
          // Authoritative: ordered after every refresh that started before this response.
          applyStatus(next, ++startedSeqRef.current)
        } else {
          // The API answered without a list: drop the row locally and re-sync.
          const current = statusRef.current
          if (current) {
            commitStatus({
              ...current,
              followers: current.followers.filter((f: TelegramFollower) => f.id !== id),
            })
          }
          void refresh({ silent: true })
        }
        toast.success(tRef.current('profile.telegram.stopSuccess'))
      } catch (err) {
        if (isAbort(err)) return
        if (err instanceof ApiError && err.status === 404) {
          // Already gone (e.g. the parent sent /stop): show the truth.
          toast.info(tRef.current('profile.telegram.followerGone'))
          void refresh({ silent: true })
        } else {
          toast.error(serverMessage(err, tRef.current('profile.telegram.stopError')))
        }
      } finally {
        removingRef.current.delete(id)
        setRemovingIds(new Set(removingRef.current))
      }
    },
    [applyStatus, commitStatus, refresh],
  )

  const reload = useCallback(() => void refresh({ silent: false }), [refresh])

  const isAvailable = status !== null && status.configured && !forcedUnavailable
  const followers = useMemo(() => status?.followers ?? [], [status])

  return {
    status,
    followers,
    botUsername: status?.botUsername ?? null,
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
  }
}
