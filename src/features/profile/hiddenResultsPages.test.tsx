// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'

const mocks = vi.hoisted(() => ({
  weekly: vi.fn(),
  monthly: vi.fn(),
  unlock: vi.fn(),
  certificate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/features/auth/userStore', () => ({
  useUserStore: { getState: () => ({ token: 'tok' }) },
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/features/profile/ProfileContext', () => ({
  useProfile: () => ({
    personalName: 'Student',
    gradeLabel: 'Grade',
    gradeName: 'Grade 4',
    stageName: 'Primary',
    classroomLabel: 'A',
    profileData: { classNumber: '1', nationalId: '', studentCode: '' },
    setSuccessCertificateUnlocked: vi.fn(),
  }),
}))
vi.mock('@/features/profile/studentProfileApi', async () => {
  const actual = await vi.importActual<typeof import('@/features/profile/studentProfileApi')>(
    '@/features/profile/studentProfileApi',
  )
  return {
    ...actual,
    getStudentWeeklyAssessments: mocks.weekly,
    getStudentMonthlyAssessments: mocks.monthly,
  }
})
vi.mock('@/features/profile/successCertificateApi', async () => {
  const actual = await vi.importActual<typeof import('@/features/profile/successCertificateApi')>(
    '@/features/profile/successCertificateApi',
  )
  return {
    ...actual,
    unlockSuccessCertificate: mocks.unlock,
    getSuccessCertificate: mocks.certificate,
  }
})

import i18n from '@/lib/i18n'
import { resetHiddenResults } from '@/features/profile/hiddenResults'
import { WeeklyEvaluationsPage } from '@/features/profile/WeeklyEvaluationsPage'
import { MonthlyEvaluationsPage } from '@/features/profile/MonthlyEvaluationsPage'
import { CertificatePage } from '@/features/profile/CertificatePage'

const MESSAGE = 'هذه البيانات غير متاحة حاليًا من إدارة المدرسة'
const hidden = (resource: string) =>
  new ApiError(MESSAGE, { status: 403, data: { hidden: true, resource } })

const weeklyPayload = (term: string | null) => ({
  filters: { term },
  summary: {
    sessions_count: 0,
    total_score: 0,
    total_max: 0,
    percentage: null,
    by_subject: [],
    by_term: [],
  },
  entries: [],
})

let root: Root
let container: HTMLDivElement

async function render(node: React.ReactNode, url = '/') {
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[url]}>{node}</MemoryRouter>)
  })
  await act(async () => {})
}

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset())
  resetHiddenResults()
  localStorage.clear()
  await i18n.changeLanguage('ar')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('weekly assessments', () => {
  it('shows the locked state for a closed term, with no retry or toast', async () => {
    mocks.weekly.mockRejectedValue(hidden('weekly_assessments'))
    await render(<WeeklyEvaluationsPage />, '/?term=first')

    expect(container.textContent).toContain(MESSAGE)
    expect(container.querySelector('[role="status"]')).not.toBeNull()
    expect(container.textContent).not.toContain(i18n.t('profile.retry'))
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('shows data for the open term and does not call the closed one again', async () => {
    mocks.weekly.mockImplementation(async (query: { term?: string }) => {
      if (query.term === 'first') throw hidden('weekly_assessments')
      return weeklyPayload(query.term ?? 'second')
    })

    await render(<WeeklyEvaluationsPage />, '/?term=first')
    expect(container.textContent).toContain(MESSAGE)
    await act(async () => root.unmount())
    root = createRoot(container)

    await render(<WeeklyEvaluationsPage />, '/?term=second')
    expect(container.textContent).not.toContain(MESSAGE)

    await act(async () => root.unmount())
    root = createRoot(container)
    mocks.weekly.mockClear()
    await render(<WeeklyEvaluationsPage />, '/?term=first')
    expect(mocks.weekly).not.toHaveBeenCalled()
    expect(container.textContent).toContain(MESSAGE)
  })

  it('without a term shows only the open term and marks the other as unavailable', async () => {
    mocks.weekly.mockResolvedValue(weeklyPayload('second'))
    await render(<WeeklyEvaluationsPage />)

    expect(container.textContent).not.toContain(MESSAGE)
    expect(container.textContent).toContain(i18n.t('profile.hidden.partial', {
      terms: i18n.t('profile.weeklyEvaluations.terms.first'),
    }))
  })

  it('locks the whole screen when both terms are closed', async () => {
    mocks.weekly.mockRejectedValue(hidden('weekly_assessments'))
    await render(<WeeklyEvaluationsPage />)

    expect(container.textContent).toContain(MESSAGE)
    expect(container.querySelector('[data-slot="select-trigger"]')).toBeNull()
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('keeps the normal error and retry for any other failure', async () => {
    mocks.weekly.mockRejectedValue(new ApiError('boom', { status: 500 }))
    await render(<WeeklyEvaluationsPage />)

    expect(container.textContent).toContain('boom')
    expect(container.textContent).toContain(i18n.t('profile.retry'))
  })

  it('treats a 403 without data.hidden as a normal error', async () => {
    mocks.weekly.mockRejectedValue(new ApiError('forbidden', { status: 403, data: null }))
    await render(<WeeklyEvaluationsPage />)

    expect(container.textContent).toContain('forbidden')
    expect(container.textContent).toContain(i18n.t('profile.retry'))
  })
})

describe('monthly assessments', () => {
  it('shows the locked state and no retry when closed', async () => {
    mocks.monthly.mockRejectedValue(hidden('monthly_assessments'))
    await render(<MonthlyEvaluationsPage />)

    expect(container.textContent).toContain(MESSAGE)
    expect(container.textContent).not.toContain(i18n.t('profile.retry'))
  })
})

describe('certificate', () => {
  async function unlockWith(token: string) {
    const input = container.querySelector<HTMLInputElement>('#certificate-qr')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(input, token)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await act(async () => {})
  }

  it('stays locked after a successful unlock when the results are closed', async () => {
    mocks.unlock.mockResolvedValue({ unlocked: true, certificate: null })
    mocks.certificate.mockRejectedValue(hidden('results'))
    await render(<CertificatePage />)
    await unlockWith('qr-token')

    expect(container.textContent).toContain(MESSAGE)
    expect(container.querySelector('form')).toBeNull()
    expect(mocks.toast.error).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    // The QR was valid, so it is kept rather than discarded as if it were wrong.
    expect(localStorage.getItem('school-frontend:success-certificate-qr')).toBe('qr-token')
  })

  it('does not call again once known to be closed', async () => {
    mocks.unlock.mockResolvedValue({ unlocked: true, certificate: null })
    mocks.certificate.mockRejectedValue(hidden('results'))
    await render(<CertificatePage />)
    await unlockWith('qr-token')

    await act(async () => root.unmount())
    root = createRoot(container)
    mocks.unlock.mockClear()
    await render(<CertificatePage />)

    expect(mocks.unlock).not.toHaveBeenCalled()
    expect(container.textContent).toContain(MESSAGE)
  })

  it('still reports a wrong code as an error', async () => {
    mocks.unlock.mockRejectedValue(new ApiError('wrong code', { status: 422 }))
    await render(<CertificatePage />)
    await unlockWith('bad')

    expect(container.textContent).toContain('wrong code')
    expect(container.querySelector('form')).not.toBeNull()
  })
})
