import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotificationsProvider } from '@/features/notifications/NotificationsProvider'

export function App() {
  return (
    <TooltipProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </NotificationsProvider>
    </TooltipProvider>
  )
}
