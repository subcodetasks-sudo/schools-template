import axios from 'axios'
import type { ApiErrorBody, ApiValidationErrors } from '@/lib/api/types'

export class ApiError extends Error {
  status: number
  errors?: ApiValidationErrors
  data?: unknown

  constructor(
    message: string,
    options: {
      status: number
      errors?: ApiValidationErrors
      data?: unknown
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.errors = options.errors
    this.data = options.data
  }
}

/** A student result the school has closed: HTTP 403 with `data.hidden === true`. */
export type HiddenInfo = {
  /** Already localized by the API; empty when the response carried none. */
  message: string
  /** e.g. `weekly_assessments`, `results`, `annual_report`. */
  resource: string | null
}

/**
 * Returns the details when `error` is the "hidden by the school" 403, else `null`.
 * Any other 403 (e.g. a non-student account) is a normal permission error, and 401 is a logout.
 */
export function getHiddenInfo(error: unknown): HiddenInfo | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null
  const data = error.data
  if (!data || typeof data !== 'object' || (data as { hidden?: unknown }).hidden !== true) {
    return null
  }
  const resource = (data as { resource?: unknown }).resource
  return {
    message: typeof error.message === 'string' ? error.message.trim() : '',
    resource: typeof resource === 'string' ? resource : null,
  }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiError) return error.message || fallback
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (body?.message) return body.message
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function getFieldErrors(error: unknown): ApiValidationErrors | undefined {
  if (error instanceof ApiError) return error.errors
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ApiErrorBody | undefined)?.errors
  }
  return undefined
}
