import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type BlogPost = {
  id: string
  title: string
  body: string
  image: string
  href?: string
}

type BlogCardProps = {
  post: BlogPost
  readMoreLabel: string
  className?: string
}

export function BlogCard({ post, readMoreLabel, className }: BlogCardProps) {
  const href = post.href ?? `/blog/${post.id}`

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-e-2xl space-y-2 ',
        className,
      )}
    >
      <Link to={href} className="aspect-4/3 overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="size-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          loading="lazy"
        />
      </Link>

      <div className="flex flex-1 flex-col px-4 py-5 sm:px-5 bg-white ">
        <Link to={href}>
          <h3 className="text-[15px] font-bold leading-snug text-brand-dark transition-colors hover:text-brand-primary sm:text-base">
            {post.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-brand-dark/55">
          {post.body}
        </p>

        <Link to={href} className="mt-5 w-fit">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-brand-primary/40 px-3 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
          >
            {readMoreLabel}
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          </Button>
        </Link>
      </div>
    </article>
  )
}
