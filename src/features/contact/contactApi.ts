import { apiGet, apiPost, unwrapList } from '@/lib/api'

export type ContactInfo = {
  id: string
  label?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  working_hours?: string | null
  social?: {
    facebook?: string | null
    instagram?: string | null
    twitter?: string | null
    youtube?: string | null
  } | null
  location?: { lat: number; lng: number } | null
  is_active: boolean
  sort_order: number
}

export async function getContactInfo() {
  const response = await apiGet<ContactInfo[]>('/v1/contact', {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapList<ContactInfo>(response)
}

export type ContactMessagePayload = {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}

export async function sendContactMessage(payload: ContactMessagePayload) {
  return apiPost('/v1/contact', payload, {
    requiresAuth: false,
    skipAuth: true,
  })
}
