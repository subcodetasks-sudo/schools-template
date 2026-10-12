import { useState, type ImgHTMLAttributes } from 'react'

const FALLBACK_IMAGE = '/logo.jpeg'

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
}

/** Renders an <img>, swapping to the school logo if the given src is missing or fails to load. */
export function ImageWithFallback({ src, ...props }: ImageWithFallbackProps) {
  // Remember which src failed instead of resetting state in an effect: a new `src` is
  // naturally retried because it no longer equals `failedSrc`.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const requested = src?.trim() || FALLBACK_IMAGE
  const currentSrc = failedSrc === requested ? FALLBACK_IMAGE : requested

  return (
    <img
      {...props}
      src={currentSrc}
      onError={() => {
        if (currentSrc !== FALLBACK_IMAGE) setFailedSrc(requested)
      }}
    />
  )
}
