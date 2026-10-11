import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Bus,
  ChevronDown,
  CircleAlert,
  MapPin,
  Phone,
  Route as RouteIcon,
  UserRound,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { GroupsPageTitle } from '@/features/groups/components/GroupsShared'
import {
  getStudentBus,
  type BusRoute,
  type BusRouteStop,
  type BusSubscription,
  type StudentBusPayload,
} from '@/features/profile/busApi'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

function localeFor(language: string) {
  return language.startsWith('ar') ? 'ar-EG' : 'en-US'
}

/** `HH:mm` / `HH:mm:ss` → localized time; anything unexpected is shown as-is. */
function formatTime(value: string | null, language: string) {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return value
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`
}

function isStudentStop(
  stop: BusRouteStop,
  subscription: BusSubscription,
): { pickup: boolean; dropoff: boolean } {
  return {
    pickup: stop.isPickup || (!!subscription.pickupStop && stop.id === subscription.pickupStop.id),
    dropoff:
      stop.isDropoff || (!!subscription.dropoffStop && stop.id === subscription.dropoffStop.id),
  }
}

function routeHasStudentStop(route: BusRoute, subscription: BusSubscription) {
  return route.stops.some((stop) => {
    const flags = isStudentStop(stop, subscription)
    return flags.pickup || flags.dropoff
  })
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Bus
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-brand-dark/45 uppercase">{label}</p>
      <div className="mt-1 text-sm font-medium wrap-break-word text-brand-dark">{children}</div>
    </div>
  )
}

function StopRow({
  label,
  name,
  time,
}: {
  label: string
  name: string | null
  time: string | null
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-brand-dark/45 uppercase">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold wrap-break-word text-brand-dark">{name ?? '—'}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-brand-primary">{time ?? '—'}</p>
    </div>
  )
}

function RouteCard({
  route,
  subscription,
  defaultOpen,
}: {
  route: BusRoute
  subscription: BusSubscription
  defaultOpen: boolean
}) {
  const { t, i18n } = useTranslation()
  const title = route.name ?? route.code ?? t('profile.bus.unnamedRoute')
  const endpoints =
    route.startPoint && route.endPoint ? [route.startPoint, route.endPoint] : null

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/route rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
    >
      <h3 className="m-0">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold wrap-break-word text-brand-dark">{title}</span>
              {route.direction ? (
                <span className="rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
                  {t(`profile.bus.directions.${route.direction}`)}
                </span>
              ) : null}
            </span>
            {endpoints ? (
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-normal text-brand-dark/55">
                <span>{endpoints[0]}</span>
                <ArrowRight className="size-3 shrink-0 rtl:-scale-x-100" aria-hidden />
                <span>{endpoints[1]}</span>
              </span>
            ) : null}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-brand-dark/50 transition-transform group-data-open/route:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
      </h3>

      <CollapsibleContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        {route.stops.length === 0 ? (
          <p className="text-sm text-brand-dark/45">{t('profile.bus.noStops')}</p>
        ) : (
          <ol className="relative ms-3 border-s-2 border-brand-dark/10">
            {route.stops.map((stop, index) => {
              const flags = isStudentStop(stop, subscription)
              const mine = flags.pickup || flags.dropoff
              const time = formatTime(stop.expectedTime, i18n.language)

              return (
                <li key={`${stop.id}:${index}`} className="relative pb-5 ps-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute inset-s-[-0.6rem] top-0.5 flex size-[1.1rem] items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ring-2',
                      mine
                        ? 'bg-brand-primary text-white ring-brand-primary/40'
                        : 'bg-muted text-brand-dark/60 ring-brand-dark/10',
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-sm wrap-break-word',
                          mine ? 'font-bold text-brand-primary' : 'font-medium text-brand-dark',
                        )}
                      >
                        {stop.name}
                      </p>
                      {mine ? (
                        <p className="mt-1 flex flex-wrap gap-1.5">
                          {flags.pickup ? (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              {t('profile.bus.yourPickup')}
                            </span>
                          ) : null}
                          {flags.dropoff ? (
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {t('profile.bus.yourDropoff')}
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    {time ? (
                      <span className="shrink-0 text-sm font-medium text-brand-dark/60">{time}</span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function SubscriptionView({ subscription }: { subscription: BusSubscription }) {
  const { t, i18n } = useTranslation()
  const { bus } = subscription
  const supervisor = bus?.supervisor ?? null
  const supervisorHref = supervisor?.phone ? phoneHref(supervisor.phone) : null
  const routes = bus?.routes ?? []

  // Open the routes the student rides; fall back to the first one so the section is never all-closed.
  const ridden = routes.filter((route) => routeHasStudentStop(route, subscription))
  const openRouteIds = new Set((ridden.length > 0 ? ridden : routes.slice(0, 1)).map((r) => r.id))

  return (
    <div className="space-y-5">
      {!subscription.isComplete ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold">{t('profile.bus.incomplete')}</p>
            <p className="mt-1 text-sm leading-relaxed">{t('profile.bus.incompleteHint')}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Panel icon={Bus} title={t('profile.bus.busTitle')}>
          {bus ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label={t('profile.bus.code')}>{bus.code ?? '—'}</Detail>
              <Detail label={t('profile.bus.plate')}>{bus.plateNumber ?? '—'}</Detail>
              {bus.model ? <Detail label={t('profile.bus.model')}>{bus.model}</Detail> : null}
              {bus.status && bus.status !== 'active' ? (
                <Detail label={t('profile.bus.status')}>
                  {t(`profile.bus.busStatuses.${bus.status}`, { defaultValue: bus.status })}
                </Detail>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-brand-dark/55">{t('profile.bus.busNotAssigned')}</p>
          )}
        </Panel>

        {supervisor ? (
          <Panel icon={UserRound} title={t('profile.bus.supervisor')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail label={t('profile.bus.supervisorName')}>{supervisor.name}</Detail>
              {supervisor.phone ? (
                <Detail label={t('profile.bus.supervisorPhone')}>
                  {supervisorHref ? (
                    <a
                      href={supervisorHref}
                      dir="ltr"
                      className="inline-flex items-center gap-1.5 text-brand-primary hover:underline"
                    >
                      <Phone className="size-3.5" aria-hidden />
                      {supervisor.phone}
                    </a>
                  ) : (
                    <span dir="ltr">{supervisor.phone}</span>
                  )}
                </Detail>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </div>

      <Panel icon={MapPin} title={t('profile.bus.tripTitle')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StopRow
            label={t('profile.bus.pickup')}
            name={subscription.pickupStop?.name ?? null}
            time={formatTime(subscription.pickupTime, i18n.language)}
          />
          <StopRow
            label={t('profile.bus.dropoff')}
            name={subscription.dropoffStop?.name ?? null}
            time={formatTime(subscription.dropoffTime, i18n.language)}
          />
        </div>
        {subscription.notes ? (
          <div className="mt-4">
            <Detail label={t('profile.bus.notes')}>{subscription.notes}</Detail>
          </div>
        ) : null}
      </Panel>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-dark">
          <RouteIcon className="size-5 text-brand-primary" aria-hidden />
          {t('profile.bus.routesTitle')}
        </h2>
        {routes.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-8 text-center text-sm text-brand-dark/45">
            {t('profile.bus.noRoutes')}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {routes.map((route) => (
              <li key={route.id}>
                <RouteCard
                  route={route}
                  subscription={subscription}
                  defaultOpen={openRouteIds.has(route.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type BusResult = { key: string; data: StudentBusPayload | null; error: string | null }

export function BusPage() {
  const { t } = useTranslation()
  const [result, setResult] = useState<BusResult | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Everything the response depends on; a result for any other key is stale, i.e. still loading.
  const requestKey = String(reloadKey)
  const current = result?.key === requestKey ? result : null
  const isLoading = current === null
  const data = current?.data ?? null
  // Empty string = the API sent no message; the fallback is resolved here so it follows the language.
  const error = current?.error == null ? null : current.error || t('profile.bus.loadError')

  useEffect(() => {
    // Only the server's current school year is shown (no year argument).
    const controller = new AbortController()

    getStudentBus(null, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setResult({ key: requestKey, data: payload, error: null })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setResult({ key: requestKey, data: null, error: getErrorMessage(err, '') })
      })

    return () => controller.abort()
  }, [requestKey])

  const shownYear = data?.academicYear ?? null

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <GroupsPageTitle>{t('profile.nav.bus')}</GroupsPageTitle>

        {shownYear ? (
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.bus.academicYear', { year: shownYear })}
          </p>
        ) : null}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/55">
        {t('profile.bus.subtitle')}
      </p>

      <div className="mt-8">
        {isLoading ? (
          <div
            role="status"
            className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55"
          >
            {t('profile.loading')}
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
            >
              {t('profile.retry')}
            </button>
          </div>
        ) : data?.subscribed && data.subscription ? (
          <SubscriptionView subscription={data.subscription} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-16 text-center">
            <span className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Bus className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-brand-dark/45">{t('profile.bus.notSubscribed')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
