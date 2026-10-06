import { apiGet, unwrapData } from '@/lib/api'

export type BusRouteDirection = 'to_school' | 'from_school' | 'round_trip'

export type BusStop = {
  id: string
  name: string
  expectedTime: string | null
}

export type BusRouteStop = BusStop & {
  position: number
  isPickup: boolean
  isDropoff: boolean
}

export type BusRoute = {
  id: string
  code: string | null
  name: string | null
  direction: BusRouteDirection | null
  startPoint: string | null
  endPoint: string | null
  stops: BusRouteStop[]
}

export type BusSupervisor = {
  id: string
  name: string
  employeeCode: string | null
  phone: string | null
}

export type BusInfo = {
  id: string
  code: string | null
  plateNumber: string | null
  model: string | null
  status: string | null
  supervisor: BusSupervisor | null
  routes: BusRoute[]
}

export type BusSubscription = {
  id: string
  status: 'pending' | 'active'
  isComplete: boolean
  notes: string | null
  pickupTime: string | null
  dropoffTime: string | null
  pickupStop: BusStop | null
  dropoffStop: BusStop | null
  bus: BusInfo | null
}

export type StudentBusPayload = {
  subscribed: boolean
  academicYear: string | null
  subscription: BusSubscription | null
}

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null') {
      return value.trim()
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function readNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

/** Returns `null` when the value is absent so callers can pick their own fallback. */
function readBoolOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return null
}

function readDirection(value: unknown): BusRouteDirection | null {
  const text = readText(value)?.toLowerCase()
  if (text === 'to_school' || text === 'from_school' || text === 'round_trip') return text
  return null
}

function mapStop(raw: unknown): BusStop | null {
  const item = asRecord(raw)
  if (!item) return null
  const name = readText(item.name)
  if (!name) return null
  return {
    id: readText(item.id) ?? name,
    name,
    expectedTime: readText(item.expected_time),
  }
}

function mapRouteStop(raw: unknown, index: number): BusRouteStop | null {
  const stop = mapStop(raw)
  if (!stop) return null
  const item = asRecord(raw) ?? {}
  return {
    ...stop,
    position: readNumber(item.position) ?? index + 1,
    isPickup: readBoolOrNull(item.is_pickup) ?? false,
    isDropoff: readBoolOrNull(item.is_dropoff) ?? false,
  }
}

function mapRoute(raw: unknown, index: number): BusRoute {
  const item = asRecord(raw) ?? {}
  const stops = asList(item.stops)
    .map(mapRouteStop)
    .filter((stop): stop is BusRouteStop => stop !== null)
    // Array#sort is stable, so equal positions keep the API order.
    .sort((a, b) => a.position - b.position)

  return {
    id: readText(item.id) ?? `route-${index}`,
    code: readText(item.code),
    name: readText(item.name),
    direction: readDirection(item.direction),
    startPoint: readText(item.start_point),
    endPoint: readText(item.end_point),
    stops,
  }
}

function mapSupervisor(raw: unknown): BusSupervisor | null {
  const item = asRecord(raw)
  if (!item) return null
  const name = readText(item.name)
  if (!name) return null
  return {
    id: readText(item.id) ?? name,
    name,
    employeeCode: readText(item.employee_code),
    phone: readText(item.phone),
  }
}

function mapBus(raw: unknown): BusInfo | null {
  const item = asRecord(raw)
  if (!item) return null
  return {
    id: readText(item.id) ?? 'bus',
    code: readText(item.code),
    plateNumber: readText(item.plate_number),
    model: readText(item.model),
    status: readText(item.status)?.toLowerCase() ?? null,
    supervisor: mapSupervisor(item.supervisor),
    routes: asList(item.routes).map(mapRoute),
  }
}

function mapSubscription(raw: unknown): BusSubscription | null {
  const item = asRecord(raw)
  if (!item) return null

  const status = readText(item.status)?.toLowerCase()
  // The API never returns `inactive` here, but never render one as an active subscription.
  if (status !== 'pending' && status !== 'active') return null

  const pickupStop = mapStop(item.pickup_stop)
  const dropoffStop = mapStop(item.dropoff_stop)

  return {
    id: readText(item.id) ?? 'subscription',
    status,
    isComplete: readBoolOrNull(item.is_complete) ?? status === 'active',
    notes: readText(item.notes),
    pickupTime: readText(item.pickup_time) ?? pickupStop?.expectedTime ?? null,
    dropoffTime: readText(item.dropoff_time) ?? dropoffStop?.expectedTime ?? null,
    pickupStop,
    dropoffStop,
    bus: mapBus(item.bus),
  }
}

export function normalizeStudentBus(raw: unknown): StudentBusPayload {
  const data = asRecord(raw) ?? {}
  // `subscribed: true` is only trusted together with a usable subscription object.
  const subscription =
    readBoolOrNull(data.subscribed) === false ? null : mapSubscription(data.subscription)

  return {
    subscribed: subscription !== null,
    academicYear: readText(data.academic_year),
    subscription,
  }
}

/**
 * Own bus subscription for one academic year (`YYYY/YYYY`); omit it for the
 * current school year. Pass `signal` to cancel a request that became stale.
 */
export async function getStudentBus(academicYear?: string | null, signal?: AbortSignal) {
  const response = await apiGet<unknown>('/v1/auth/student/profile/bus', {
    requiresAuth: true,
    params: academicYear ? { academic_year: academicYear } : undefined,
    signal,
  })
  return normalizeStudentBus(unwrapData(response))
}
