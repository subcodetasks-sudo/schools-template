import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SchoolEvent = {
  id: string
  title: string
  body: string
  image: string
  dateLabel: string
  href?: string
}

type EventCardProps = {
  event: SchoolEvent
  active?: boolean
  /** Grid/list layout: always show details with a shorter image. */
  dense?: boolean
  className?: string
}

export function EventCard({
  event,
  active = false,
  dense = false,
  className,
}: EventCardProps) {
  const showDetails = dense || active
  const href = event.href ?? `/events/${event.id}`

  const card = (
    <article
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-e-2xl',
        showDetails
          ? 'bg-white shadow-[0_10px_32px_rgba(31,83,111,0.14)]'
          : 'bg-transparent shadow-none',
        dense && 'transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          dense ? 'aspect-4/3' : 'h-80',
        )}
      >
        <img
          src={event.image}
          alt={event.title}
          className="size-full object-cover"
          loading="lazy"
          draggable={false}
        />
        {showDetails ? (
          <div className="absolute inset-x-0 bottom-0 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden />
              {event.dateLabel}
            </span>
          </div>
        ) : null}
      </div>

      {showDetails ? (
        <div className="flex flex-1 flex-col px-4 py-5 text-center sm:px-5">
          <h3 className="text-[15px] font-bold leading-snug text-brand-dark sm:text-base">
            {event.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-brand-dark/55">
            {event.body}
          </p>
        </div>
      ) : null}
    </article>
  )

  if (!dense) return card

  return (
    <Link to={href} className="block h-full">
      {card}
    </Link>
  )
}
