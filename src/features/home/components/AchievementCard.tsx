import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type AchievementAccent = 'emerald' | 'gold' | 'rose'

export type Achievement = {
  id: string
  title: string
  body: string
  image: string
  accent: AchievementAccent
  href?: string
}

const accentBar: Record<AchievementAccent, string> = {
  emerald: 'bg-emerald-500',
  gold: 'bg-amber-400',
  rose: 'bg-rose-600',
}

type AchievementCardProps = {
  achievement: Achievement
  className?: string
  notchClassName?: string
}

export function AchievementCard({
  achievement,
  className,
  notchClassName,
}: AchievementCardProps) {
  const href = achievement.href ?? `/achievements/${achievement.id}`

  const card = (
    <article
      className={cn(
        'relative flex h-full flex-col space-y-2 overflow-hidden rounded-tl-4xl transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0 left-1/2 z-10 h-12 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted',
          notchClassName,
        )}
      />

      <div className="aspect-16/10 shrink-0 overflow-hidden">
        <img
          src={achievement.image}
          alt={achievement.title}
          className="size-full object-cover"
          loading="lazy"
        />
      </div>

      <div className={cn('h-1 shrink-0', accentBar[achievement.accent])} />

      <div className="flex flex-1 flex-col bg-white px-5 py-6 text-center rounded-bl-2xl sm:px-6">
        <h3 className="text-[15px] font-bold leading-snug text-brand-dark sm:text-base">
          {achievement.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-brand-dark/55">{achievement.body}</p>
      </div>
    </article>
  )

  return (
    <Link to={href} className="block h-full">
      {card}
    </Link>
  )
}
