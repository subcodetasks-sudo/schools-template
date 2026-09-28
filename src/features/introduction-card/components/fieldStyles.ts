import { authFieldClass } from '@/features/auth/AuthShell'
import { cn } from '@/lib/utils'

export const textareaFieldClass = cn(authFieldClass, 'h-auto min-h-28 resize-y py-3 leading-relaxed')

export const invalidFieldClass = 'border-destructive/50 focus:border-destructive'
