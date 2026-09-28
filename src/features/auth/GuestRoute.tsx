import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUserStore } from '@/features/auth/userStore'
import { getPostLoginRedirect } from '@/features/auth/redirect'

/** Guest-only pages (login, register): signed-in users are sent on to where they belong. */
export function GuestRoute() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (isAuthenticated) {
    return <Navigate to={getPostLoginRedirect(location)} replace />
  }

  return <Outlet />
}
