import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type PrintPdfDocumentProps = {
  open: boolean
  children: ReactNode
  onDone: () => void
}

/**
 * Portals the official PDF shell off-screen, flips `body.pdf-document-print`,
 * prints, then cleans up on `afterprint`.
 */
export function PrintPdfDocument({ open, children, onDone }: PrintPdfDocumentProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const printedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      printedRef.current = false
      return
    }

    let cancelled = false
    const body = document.body

    const cleanup = () => {
      body.classList.remove('pdf-document-print')
      window.removeEventListener('afterprint', handleAfterPrint)
      onDone()
    }

    const handleAfterPrint = () => {
      cleanup()
    }

    const runPrint = async () => {
      const root = rootRef.current
      if (!root || cancelled || printedRef.current) return

      const images = Array.from(root.querySelectorAll('img'))
      await Promise.all(
        images.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener('load', () => resolve(), { once: true })
                  img.addEventListener('error', () => resolve(), { once: true })
                }),
        ),
      )

      if (cancelled) return
      printedRef.current = true
      body.classList.add('pdf-document-print')
      window.addEventListener('afterprint', handleAfterPrint)
      // Let the browser paint the print root before opening the dialog.
      window.setTimeout(() => {
        if (cancelled) return
        window.print()
      }, 50)
    }

    void runPrint()

    return () => {
      cancelled = true
      body.classList.remove('pdf-document-print')
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [open, onDone])

  if (!open) return null

  return createPortal(
    <div ref={rootRef} className="pdf-print-root">
      {children}
    </div>,
    document.body,
  )
}
