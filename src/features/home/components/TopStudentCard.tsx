import { cn } from '@/lib/utils'

export type TopStudent = {
  id: string
  name: string
  image: string
  rank: number
}

type TopStudentCardProps = {
  student: TopStudent
  className?: string
}

export function TopStudentCard({ student, className }: TopStudentCardProps) {
  const rankLabel = String(student.rank).padStart(2, '0')

  return (
    <article className={cn('group flex flex-col items-center gap-5 ', className)}>
      <div className="relative w-full  pt-12 ">
        <span
          aria-hidden
          className="pointer-events-none   font-sans text-4xl leading-[0.85] font-bold text-brand-primary select-none sm:text-5xl ms-7 "
        >
          {rankLabel}
        </span>

        <div className="relative z-10 mx-auto mt-1 w-[70%]">
          <span
            aria-hidden
            className="absolute top-0 h-[calc(100%-5rem)] -inset-s-3 w-1 rounded-full bg-brand-secondary"
          />
          <span
            aria-hidden
            className="absolute  bottom-0 h-[calc(100%-5rem)] -inset-e-3 w-1 rounded-full bg-brand-primary"
          />

          <div className="overflow-hidden  transition-transform duration-300 group-hover:-translate-y-1 h-70 rounded-lg">
            <img
              src={student.image}
              alt={student.name}
              className="size-full object-cover object-top"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <h3 className="px-2 text-center text-sm font-bold text-brand-dark sm:text-[15px]">
        {student.name}
      </h3>
    </article>
  )
}
