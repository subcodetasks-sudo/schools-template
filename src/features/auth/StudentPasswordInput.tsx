import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { authFieldClass } from '@/features/auth/AuthShell'
import { sanitizeStudentPassword } from '@/features/auth/studentPassword'
import { cn } from '@/lib/utils'

type StudentPasswordInputProps = {
  id: string
  /** The result of react-hook-form's `register(...)` for this field. */
  registration: UseFormRegisterReturn
  placeholder?: string
  showLabel: string
  hideLabel: string
  invalid?: boolean
  describedBy?: string
}

/**
 * Digits-only password input for students. Typed, pasted, dropped and autofilled
 * text is filtered to `0-9` (Arabic-Indic digits are converted) before it reaches the form.
 * Deliberately not `type="number"`: that drops leading zeros and allows `e` and `+`.
 */
export function StudentPasswordInput({
  id,
  registration,
  placeholder,
  showLabel,
  hideLabel,
  invalid,
  describedBy,
}: StudentPasswordInputProps) {
  const [show, setShow] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const raw = input.value
    const clean = sanitizeStudentPassword(raw)

    if (clean !== raw) {
      const caret = input.selectionStart ?? raw.length
      const cleanCaret = Math.min(sanitizeStudentPassword(raw.slice(0, caret)).length, clean.length)
      input.value = clean
      try {
        input.setSelectionRange(cleanCaret, cleanCaret)
      } catch {
        // Some input types/browsers refuse selection; the caret simply goes to the end.
      }
    }

    void registration.onChange(event)
  }

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="new-password"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(authFieldClass, 'pe-11 shadow-sm')}
        {...registration}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute inset-e-3 top-1/2 inline-flex -translate-y-1/2 text-brand-dark/45 transition-colors hover:text-brand-primary"
        aria-label={show ? hideLabel : showLabel}
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
