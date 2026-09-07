import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import i18n from '@/lib/i18n'
import { ApiError } from '@/lib/api/errors'
import type { ApiEnvelope, ApiErrorBody } from '@/lib/api/types'

export const AUTH_STORAGE_KEY = 'school-user-auth'

const PUBLIC_API_PATHS = [
  '/v1/auth/login',
  '/v1/auth/student/register/step1',
  '/v1/auth/student/register/step2',
] as const

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip Authorization header even if a token exists. */
    skipAuth?: boolean
    /** Require a token; reject locally when missing. Defaults to true for non-public paths. */
    requiresAuth?: boolean
  }

  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean
    requiresAuth?: boolean
  }
}

function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } }
    return parsed.state?.token ?? null
  } catch {
    return null
  }
}

function getAppLanguage() {
  return i18n.language?.startsWith('ar') ? 'ar' : 'en'
}

function normalizePath(url = '') {
  try {
    if (url.startsWith('http')) {
      return new URL(url).pathname
    }
  } catch {
    // keep original relative path
  }
  return url.split('?')[0] ?? url
}

function isPublicApiPath(url = '') {
  const path = normalizePath(url)
  return PUBLIC_API_PATHS.some((publicPath) => path.endsWith(publicPath) || path.includes(publicPath))
}

function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  if (path === '/login' || path === '/register') return
  window.location.assign(`/login?redirect=${encodeURIComponent(path)}`)
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '') ||
  'https://madrasa.subcodeco.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const lang = getAppLanguage()
  config.headers.set('Accept-Language', lang)
  config.headers.set('lang', lang)

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Let the browser set multipart boundary.
    config.headers.delete('Content-Type')
  }

  const publicPath = isPublicApiPath(config.url)
  const requiresAuth = config.requiresAuth ?? !publicPath
  const token = readStoredToken()

  if (token && !config.skipAuth) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else if (requiresAuth && !config.skipAuth) {
    return Promise.reject(
      new ApiError('Unauthenticated.', {
        status: 401,
        data: null,
      }),
    )
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(error)
    }

    const { status, config, data } = error.response
    const body = data as ApiErrorBody | undefined
    const message = body?.message || error.message || 'Request failed'
    const publicPath = isPublicApiPath(config?.url)

    if (status === 401 && !publicPath && !config?.skipAuth) {
      clearAuthStorage()
      void import('@/features/auth/userStore').then(({ useUserStore }) => {
        useUserStore.setState({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      })
      redirectToLogin()
    }

    return Promise.reject(
      new ApiError(message, {
        status,
        errors: body?.errors,
        data: body?.data,
      }),
    )
  },
)

export async function apiRequest<T>(config: AxiosRequestConfig) {
  const response = await api.request<ApiEnvelope<T> | T>(config)
  return response.data
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'GET', url })
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'POST', url, data })
}

export async function apiUpload<T>(url: string, data: FormData, config?: AxiosRequestConfig) {
  return apiRequest<T>({
    ...config,
    method: 'POST',
    url,
    data,
    headers: {
      ...config?.headers,
      'Content-Type': undefined,
    },
  })
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'DELETE', url })
}

export function unwrapData<T>(payload: ApiEnvelope<T> | T): T {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return payload as T
  }

  const first = (payload as ApiEnvelope<T>).data

  // Handle rare double-wrapped envelopes: { data: { data: {...} } }
  if (first && typeof first === 'object' && 'data' in first && 'success' in first) {
    return (first as unknown as ApiEnvelope<T>).data
  }

  return first
}
