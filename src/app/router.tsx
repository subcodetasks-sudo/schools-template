import { createBrowserRouter } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { HomePage } from '@/features/home/HomePage'
import { TopStudentsPage } from '@/features/top-students/TopStudentsPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { BlogPage } from '@/features/blog/BlogPage'
import { ContactPage } from '@/features/contact/ContactPage'
import { LoginPage } from '@/features/auth/LoginPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'top-students', element: <TopStudentsPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
])
