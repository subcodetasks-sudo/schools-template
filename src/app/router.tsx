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
import { ProfileLayout } from '@/features/profile/ProfileLayout'
import { PersonalInfoPage } from '@/features/profile/PersonalInfoPage'
import { CertificatePage } from '@/features/profile/CertificatePage'
import { MonthlyEvaluationsPage } from '@/features/profile/MonthlyEvaluationsPage'
import { SchedulePage } from '@/features/profile/SchedulePage'
import { ParentSummonPage } from '@/features/profile/ParentSummonPage'
import { StatisticsPage } from '@/features/profile/StatisticsPage'

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
      {
        path: 'profile',
        element: <ProfileLayout />,
        children: [
          { index: true, element: <PersonalInfoPage /> },
          {
            path: 'certificate',
            element: <CertificatePage />,
          },
          {
            path: 'monthly-evaluations',
            element: <MonthlyEvaluationsPage />,
          },
          {
            path: 'schedule',
            element: <SchedulePage />,
          },
          {
            path: 'parent-summon',
            element: <ParentSummonPage />,
          },
          {
            path: 'statistics',
            element: <StatisticsPage />,
          },
        ],
      },
    ],
  },
])
