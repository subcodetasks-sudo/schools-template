type AudioContextCtor = typeof AudioContext

let context: AudioContext | null = null
let unlockBound = false

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (context) return context

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null

  context = new Ctor()
  return context
}

/**
 * Browsers block audio until the user interacts with the page, so resume the
 * shared AudioContext on the first click/keypress/touch.
 */
export function unlockNotificationSound() {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true

  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx?.state === 'suspended') void ctx.resume()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }

  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)
}

function playTone(ctx: AudioContext, frequency: number, start: number, duration: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

/** Short two-note chime for incoming notifications. Fails silently if audio is blocked. */
export function playNotificationSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    playTone(ctx, 880, now, 0.25)
    playTone(ctx, 1318.5, now + 0.14, 0.35)
  } catch {
    // Audio can be blocked by the browser; the toast still shows.
  }
}
