import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthContext'

export function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </AuthProvider>
  )
}
