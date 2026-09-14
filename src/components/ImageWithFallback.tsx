import { useEffect, useState, type ImgHTMLAttributes } from 'react'

const FALLBACK_IMAGE = '/logo.jpeg'

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
}

/** Renders an <img>, swapping to the school logo if the given src is missing or fails to load. */
export function ImageWithFallback({ src, ...props }: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src?.trim() || FALLBACK_IMAGE)

  useEffect(() => {
    setCurrentSrc(src?.trim() || FALLBACK_IMAGE)
  }, [src])

  return (
    <img
      {...props}
      src={currentSrc}
      onError={() => {
        if (currentSrc !== FALLBACK_IMAGE) setCurrentSrc(FALLBACK_IMAGE)
      }}
    />
  )
}
