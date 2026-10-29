export {
  api,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  apiUpload,
  apiRequest,
  unwrapData,
  unwrapList,
  AUTH_STORAGE_KEY,
  registerAuthBridge,
} from '@/lib/api/client'
export { ApiError, getErrorMessage, getFieldErrors, getHiddenInfo } from '@/lib/api/errors'
export type { HiddenInfo } from '@/lib/api/errors'
export type { ApiEnvelope, ApiErrorBody, ApiValidationErrors } from '@/lib/api/types'
