export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export type ApiValidationErrors = Record<string, string[]>

export type ApiErrorBody = {
  success?: boolean
  message?: string
  errors?: ApiValidationErrors
  data?: unknown
}
