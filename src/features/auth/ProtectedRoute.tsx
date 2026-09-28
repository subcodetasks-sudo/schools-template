import { Fragment } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUserStore } from '@/features/auth/userStore'
import type { AuthRedirectState } from '@/features/auth/redirect'

export function ProtectedRoute() {
  const token = useUserStore((state) => state.token)
  const loggedOut = useUserStore((state) => state.signOutReason === 'logout')
  const { pathname, search, hash } = useLocation()

  if (!token) {
    // After a deliberate logout, don't send the next person back to this page.
    const state: AuthRedirectState | undefined = loggedOut
      ? undefined
      : { from: { pathname, search, hash } }
    return <Navigate to="/login" replace state={state} />
  }

  // Remount on session change (e.g. another tab signs in as a different student)
  // so no page keeps showing the previous student's data.
  return (
    <Fragment key={token}>
      <Outlet />
    </Fragment>
  )
}
