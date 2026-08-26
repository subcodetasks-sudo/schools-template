import { createBrowserRouter } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { HomePage } from '@/features/home/HomePage'
import { TopStudentsPage } from '@/features/top-students/TopStudentsPage'
import { AchievementsPage } from '@/features/achievements/AchievementsPage'
import { AchievementDetailPage } from '@/features/achievements/AchievementDetailPage'
import { EventsPage } from '@/features/events/EventsPage'
import { EventDetailPage } from '@/features/events/EventDetailPage'
import { BlogPage } from '@/features/blog/BlogPage'
import { BlogDetailPage } from '@/features/blog/BlogDetailPage'
import { ContactPage } from '@/features/contact/ContactPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { TermsOfApplyingPage } from '@/features/terms/TermsOfApplyingPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'top-students', element: <TopStudentsPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'achievements/:id', element: <AchievementDetailPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:id', element: <EventDetailPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'blog/:id', element: <BlogDetailPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'terms-of-applying', element: <TermsOfApplyingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
])
