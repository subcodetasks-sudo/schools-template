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
